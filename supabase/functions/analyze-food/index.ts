// Supabase Edge Function: analyze-food
// 作用：接收客户端上传的食物照片（base64，不落盘），调用国产多模态大模型，
//      返回结构化食物列表 + 估算热量/三大营养素。
//
// 部署：
//   supabase secrets set DASHSCOPE_API_KEY=sk-xxxx
//   supabase functions deploy analyze-food
//
// 可选环境变量：
//   VISION_MODEL      默认 qwen3.7-plus（百炼视觉理解模型；旧的 qwen-vl-plus 已下线）
//   VISION_BASE_URL   默认 https://dashscope.aliyuncs.com/compatible-mode/v1
//   DAILY_LIMIT       单用户每日识别次数上限，默认 20

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_MODEL = 'qwen3.7-plus';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_DAILY_LIMIT = 20;

const SYSTEM_PROMPT = `你是专业的营养师和食物图像识别专家。请识别图片中的食物，并估算其营养信息。
要求：
1. 只输出 JSON，不要输出任何解释性文字或 markdown 代码块。
2. 中文菜名优先（如"番茄炒蛋"），尽量拆分为独立的食物条目。
3. 份量按常见单人餐估算，单位用 "g"（固体）、"ml"（液体）、"piece"（个/只）、"bowl"（碗）。
4. 中式炒菜必须计入烹饪油的热量（通常 5-15g）。
5. 每项给出 confidence（0-1），表示识别与份量估算的确定程度。
6. 无法确认是否为食物时 return 空 items。

输出 JSON 结构（严格遵守）：
{
  "items": [
    { "name": "番茄炒蛋", "amount": 250, "unit": "g",
      "calories": 240, "protein": 12, "carbs": 9, "fat": 17, "confidence": 0.8 }
  ],
  "note": "份量按单盘估算，含约10g烹饪油"
}`;

const USER_PROMPT = '识别这张图片中的所有食物，按上述 JSON 结构返回。';

// ── 简易限流（内存级，仅作基础保护；生产建议改用数据库或 Redis）──
const rateLimit = new Map<string, number>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── 从模型文本中容错提取 JSON ──
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('模型未返回合法 JSON');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: '仅支持 POST' }, 405);
  }

  try {
    // 1. 鉴权：校验客户端带来的 JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      // 业务错误统一返回 200 + ok:false，避免客户端被 supabase-js 的通用 non-2xx 提示吞掉细节
      return json({ ok: false, error: '未登录' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return json({ ok: false, error: '登录状态无效' });
    }

    // 2. 限流
    const dailyLimit = Number(Deno.env.get('DAILY_LIMIT') || DEFAULT_DAILY_LIMIT);
    const key = `${user.id}:${todayKey()}`;
    const used = rateLimit.get(key) || 0;
    if (used >= dailyLimit) {
      return json({ ok: false, error: `今日识别次数已达上限（${dailyLimit} 次）` });
    }

    // 3. 解析入参
    const body = await req.json().catch(() => null) as
      | { imageBase64?: string; mimeType?: string }
      | null;
    const imageBase64 = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ ok: false, error: '缺少图片数据' });
    }
    // 体积保护：base64 超过 ~8MB 直接拒绝
    if (imageBase64.length > 8 * 1024 * 1024) {
      return json({ ok: false, error: '图片过大，请重新拍摄' });
    }

    // 4. 调用国产多模态模型（OpenAI 兼容接口，默认通义千问 VL）
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY');
    if (!apiKey) {
      console.error('analyze-food: DASHSCOPE_API_KEY is not set in function secrets');
      return json({ ok: false, error: '服务端未配置 DASHSCOPE_API_KEY' });
    }

    const model = Deno.env.get('VISION_MODEL') || DEFAULT_MODEL;
    const baseUrl = Deno.env.get('VISION_BASE_URL') || DEFAULT_BASE_URL;
    const mimeType = body?.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';

    const modelRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!modelRes.ok) {
      const detail = await modelRes.text();
      console.error('model request failed:', modelRes.status, detail);
      return json({ ok: false, error: `识别模型调用失败（${modelRes.status}）` });
    }

    const modelJson = await modelRes.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const content = modelJson.choices?.[0]?.message?.content || '';
    if (!content) {
      return json({ ok: false, error: '模型返回为空' });
    }

    // 5. 解析并清洗
    const parsed = extractJson(content) as { items?: unknown[]; note?: string };
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    rateLimit.set(key, used + 1);

    return json({ ok: true, items, note: parsed.note || '' });
  } catch (e) {
    console.error('analyze-food error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : '识别失败' });
  }
});
