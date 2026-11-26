// Supabase Edge Function: lookup-barcode
// 作用：服务端代理查询 OpenFoodFacts，解决手机直连境外站点超时/不可达的问题。
// 输入：{ barcode: "6901234567892" }
// 输出：
//   找到    { ok: true, product: { barcode, name, brand, quantity, servingGrams, imageUrl, per100g } }
//   未找到  { ok: true, reason: 'not_found' | 'no_nutrition' }
//   失败    { ok: false, error: '...' }
//
// 部署：
//   supabase functions deploy lookup-barcode
// 不需要额外 Secret（OpenFoodFacts 免费公开接口）。
//
// 可选环境变量：
//   OFF_HOST  默认 https://world.openfoodfacts.org

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_HOST = 'https://world.openfoodfacts.org';
const USER_AGENT = 'FitTrack/1.0 (Supabase Edge Function; barcode lookup)';
const TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时
const CACHE_MAX = 500;

const FIELDS = [
  'product_name',
  'product_name_zh',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'image_front_small_url',
].join(',');

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();

const round1 = (v: number) => Math.round(v * 10) / 10;

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function normalizeBarcode(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function pickKcalPer100g(nutriments: Record<string, unknown>): number | undefined {
  const kcal = num(nutriments['energy-kcal_100g']) ?? num(nutriments['energy-kcal']);
  if (kcal !== undefined) return kcal;
  const kj = num(nutriments['energy_100g']) ?? num(nutriments['energy-kj_100g']);
  if (kj !== undefined) return kj / 4.184;
  return undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function readCache(barcode: string): unknown | null {
  const hit = cache.get(barcode);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(barcode);
    return null;
  }
  return hit.payload;
}

function writeCache(barcode: string, payload: unknown): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(barcode, { at: Date.now(), payload });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: '仅支持 POST' }, 405);
  }

  try {
    const body = (await req.json().catch(() => null)) as { barcode?: string } | null;
    const barcode = normalizeBarcode(String(body?.barcode || ''));
    if (!barcode) {
      return json({ ok: true, reason: 'not_found' });
    }

    const cached = readCache(barcode);
    if (cached) return json(cached);

    const host = Deno.env.get('OFF_HOST') || DEFAULT_HOST;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let data: { status?: number | string; product?: Record<string, unknown> } | null = null;
    try {
      const res = await fetch(`${host}/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      // v2 接口对未收录商品返回 404，应作为「查无此商品」返回，而不是服务故障
      if (res.status === 404) {
        const payload = { ok: true, reason: 'not_found' };
        writeCache(barcode, payload);
        return json(payload);
      }
      if (!res.ok) {
        console.error('lookup-barcode upstream HTTP', res.status);
        return json({ ok: false, error: `上游返回 HTTP ${res.status}` });
      }
      data = (await res.json()) as { status?: number | string; product?: Record<string, unknown> };
    } catch (e) {
      console.error('lookup-barcode upstream failed:', e);
      return json({ ok: false, error: '上游查询超时或不可达' });
    } finally {
      clearTimeout(timer);
    }

    if (!data?.product || data.status === 0 || data.status === 'failure') {
      const payload = { ok: true, reason: 'not_found' };
      writeCache(barcode, payload);
      return json(payload);
    }

    const raw = data.product;
    const nutriments = (raw.nutriments as Record<string, unknown>) || {};
    const calories = pickKcalPer100g(nutriments);
    const name = String(raw.product_name_zh || raw.product_name || '').trim();
    const brand = typeof raw.brands === 'string' ? raw.brands.split(',')[0].trim() : '';

    if (!name && !brand) {
      const payload = { ok: true, reason: 'not_found' };
      writeCache(barcode, payload);
      return json(payload);
    }
    if (calories === undefined) {
      const payload = { ok: true, reason: 'no_nutrition' };
      writeCache(barcode, payload);
      return json(payload);
    }

    const serving = num(raw.serving_quantity);
    const payload = {
      ok: true,
      product: {
        barcode,
        name: name || brand,
        brand: brand || undefined,
        quantity: typeof raw.quantity === 'string' ? raw.quantity : undefined,
        servingGrams: serving !== undefined && serving > 0 ? serving : undefined,
        imageUrl:
          typeof raw.image_front_small_url === 'string' ? raw.image_front_small_url : undefined,
        per100g: {
          calories: round1(calories),
          protein: num(nutriments['proteins_100g']),
          carbs: num(nutriments['carbohydrates_100g']),
          fat: num(nutriments['fat_100g']),
        },
      },
    };

    writeCache(barcode, payload);
    return json(payload);
  } catch (e) {
    console.error('lookup-barcode error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : '查询失败' });
  }
});
