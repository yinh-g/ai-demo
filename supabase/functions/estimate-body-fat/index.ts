// Supabase Edge Function: estimate-body-fat
// 输入：{ imageBase64, mimeType }
// 输出：{ ok: true, bodyFat, range: { low, high }, confidence, note }
//
// 部署：
//   supabase secrets set DASHSCOPE_API_KEY=sk-xxxx
//   supabase functions deploy estimate-body-fat
//
// 可选环境变量：
//   VISION_MODEL      默认 qwen3.7-plus
//   VISION_BASE_URL   默认 https://dashscope.aliyuncs.com/compatible-mode/v1
//   DAILY_LIMIT       单用户每日次数上限，默认 10
//
// 说明：照片体脂估算误差很大（通常 ±5%），客户端只给低权重，
// 这里也要求模型返回区间与置信度，便于上层做不确定度建模。

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_MODEL = 'qwen3.7-plus';
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_DAILY_LIMIT = 10;

const SYSTEM_PROMPT = `你是运动营养与体成分评估专家。用户会上传一张（半身或全身）照片，请粗略估算体脂率。
要求：
1. 只输出 JSON，不要输出解释性文字或 markdown 代码块。
2. bodyFat 为 3-60 之间的数字（保留 1 位小数），按成年亚洲人群经验给出。
3. range 给出合理区间（左右各约 3-5 个百分点）。
4. confidence 为 0-1：照片越完整（全身、正面、自然站姿、光线良好）、可见肌肉线条越清晰，置信度越高；只露半身或穿厚衣服时置信度应低于 0.4。
5. 若照片里没有人、看不清身体，返回 bodyFat 为 0 并说明原因。
6. 在 note 中用一句中文说明依据与局限（如“照片角度与光线会带来误差，仅供参考”）。

输出 JSON 结构（严格遵守）：
{
  "bodyFat": 18.5,
  "range": { "low": 15.5, "high": 21.5 },
  "confidence": 0.45,
  "note": "正面全身照，肌肉线条可见度一般"
}`;

const rateLimit = new Map<string, number>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('模型未返回合法 JSON');
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
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ ok: false, error: '未登录' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ ok: false, error: '登录状态无效' });

    const dailyLimit = Number(Deno.env.get('DAILY_LIMIT') || DEFAULT_DAILY_LIMIT);
    const key = `${user.id}:${todayKey()}`;
    const used = rateLimit.get(key) || 0;
    if (used >= dailyLimit) {
      return json({ ok: false, error: `今日拍照估算次数已达上限（${dailyLimit} 次）` });
    }

    const body = await req.json().catch(() => null) as
      | { imageBase64?: string; mimeType?: string; hint?: string }
      | null;

    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
    if (!imageBase64) return json({ ok: false, error: '缺少图片' });
    if (imageBase64.length > 8 * 1024 * 1024) {
      return json({ ok: false, error: '图片过大，请重新拍摄' });
    }

    const apiKey = Deno.env.get('DASHSCOPE_API_KEY');
    if (!apiKey) {
      console.error('estimate-body-fat: DASHSCOPE_API_KEY is not set in function secrets');
      return json({ ok: false, error: '服务端未配置 DASHSCOPE_API_KEY' });
    }

    const model = Deno.env.get('VISION_MODEL') || DEFAULT_MODEL;
    const baseUrl = Deno.env.get('VISION_BASE_URL') || DEFAULT_BASE_URL;
    const mimeType = body?.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const hint = typeof body?.hint === 'string' ? body.hint.trim() : '';

    const userText = hint
      ? `请结合这张照片估算体脂率。用户补充信息：${hint}。按上述 JSON 结构返回。`
      : '请根据这张照片估算体脂率，并按上述 JSON 结构返回。';

    const modelRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
    });

    if (!modelRes.ok) {
      const detail = await modelRes.text();
      console.error('estimate-body-fat model failed:', modelRes.status, detail);
      return json({ ok: false, error: `估算模型调用失败（${modelRes.status}）` });
    }

    const modelJson = await modelRes.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const content = modelJson.choices?.[0]?.message?.content || '';
    if (!content) return json({ ok: false, error: '模型返回为空' });

    const parsed = extractJson(content) as {
      bodyFat?: unknown;
      range?: { low?: unknown; high?: unknown };
      confidence?: unknown;
      note?: string;
    };

    const num = (v: unknown): number | undefined => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
      return Number.isFinite(n) ? n : undefined;
    };

    const bodyFat = num(parsed.bodyFat);
    if (bodyFat === undefined || bodyFat <= 0) {
      return json({ ok: false, error: parsed.note || '未能从照片中估算体脂，请换一张全身照' });
    }

    rateLimit.set(key, used + 1);

    const clampPct = (v: number) => Math.max(3, Math.min(60, v));
    const low = num(parsed.range?.low);
    const high = num(parsed.range?.high);
    const confidence = num(parsed.confidence);

    return json({
      ok: true,
      bodyFat: clampPct(bodyFat),
      range: {
        low: clampPct(low ?? bodyFat - 4),
        high: clampPct(high ?? bodyFat + 4),
      },
      confidence: confidence !== undefined ? Math.min(1, Math.max(0, confidence)) : 0.35,
      note: parsed.note || '',
    });
  } catch (e) {
    console.error('estimate-body-fat error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : '估算失败' });
  }
});
