import { FoodItem } from '../../types';

// 条形码 → 商品营养查询（OpenFoodFacts 免费版，无需 API Key）
// 局限：只覆盖包装食品，国内本土品牌收录率一般；查不到时需要降级到拍照/手动录入。

export interface NutritionPer100g {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  quantity?: string;        // 包装规格原文，如 "500 g"
  servingGrams?: number;    // 建议单次份量（g/ml）
  imageUrl?: string;
  per100g: NutritionPer100g;
}

export type BarcodeLookupResult =
  | { found: true; product: BarcodeProduct }
  | { found: false; reason: 'invalid' | 'not_found' | 'no_nutrition' | 'network' };

// 主站优先，国内镜像兜底
const HOSTS = ['https://world.openfoodfacts.org', 'https://cn.openfoodfacts.org'];
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

const TIMEOUT_MS = 7000;
const USER_AGENT = 'FitTrack/1.0 (Expo; barcode lookup)';

// 结果缓存：成功与“确实没有”都缓存，网络错误不缓存以便重试
const cache = new Map<string, BarcodeLookupResult>();

const round1 = (v: number) => Math.round(v * 10) / 10;

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

// 条码规范化：仅保留数字，EAN-8/12/13/14 都接受
export function normalizeBarcode(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function pickKcalPer100g(nutriments: Record<string, unknown>): number | undefined {
  // 0 是合法值（饮用水、无糖茶等），不能用 > 0 过滤
  const kcal = num(nutriments['energy-kcal_100g']) ?? num(nutriments['energy-kcal']);
  if (kcal !== undefined) return kcal;
  // 部分商品只提供 kJ
  const kj = num(nutriments['energy_100g']) ?? num(nutriments['energy-kj_100g']);
  if (kj !== undefined) return kj / 4.184;
  return undefined;
}

async function fetchOne(host: string, barcode: string): Promise<BarcodeLookupResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${host}/api/v2/product/${barcode}.json?fields=${FIELDS}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: number | string;
      product?: Record<string, unknown>;
    } | null;

    const raw = data?.product;
    if (!raw || data?.status === 0 || data?.status === 'failure') {
      return { found: false, reason: 'not_found' };
    }

    const nutriments = (raw.nutriments as Record<string, unknown>) || {};
    const calories = pickKcalPer100g(nutriments);
    const name = String(raw.product_name_zh || raw.product_name || '').trim();
    const brand = typeof raw.brands === 'string' ? raw.brands.split(',')[0].trim() : '';

    if (!name && !brand) return { found: false, reason: 'not_found' };
    if (calories === undefined) return { found: false, reason: 'no_nutrition' };

    const serving = num(raw.serving_quantity);

    return {
      found: true,
      product: {
        barcode,
        name: name || brand,
        brand: brand || undefined,
        quantity: typeof raw.quantity === 'string' ? raw.quantity : undefined,
        servingGrams: serving !== undefined && serving > 0 ? serving : undefined,
        imageUrl: typeof raw.image_front_small_url === 'string' ? raw.image_front_small_url : undefined,
        per100g: {
          calories: round1(calories),
          protein: num(nutriments['proteins_100g']),
          carbs: num(nutriments['carbohydrates_100g']),
          fat: num(nutriments['fat_100g']),
        },
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcode(raw: string, options?: { force?: boolean }): Promise<BarcodeLookupResult> {
  const barcode = normalizeBarcode(raw);
  if (!barcode) return { found: false, reason: 'invalid' };

  if (!options?.force) {
    const hit = cache.get(barcode);
    if (hit) return hit;
  }

  let networkFailed = false;
  for (const host of HOSTS) {
    const result = await fetchOne(host, barcode);
    if (result) {
      cache.set(barcode, result);
      return result;
    }
    networkFailed = true;
  }

  // 网络问题不入缓存，允许用户重试
  return { found: false, reason: networkFailed ? 'network' : 'not_found' };
}

// 把商品转换成 FoodItem：默认按建议份量（缺失时按 100g），热量按份量折算
export function productToFoodItem(product: BarcodeProduct, grams?: number): FoodItem {
  const amount =
    grams !== undefined && grams > 0
      ? grams
      : product.servingGrams !== undefined && product.servingGrams > 0
      ? product.servingGrams
      : 100;
  const ratio = amount / 100;

  const name =
    product.brand && product.brand !== product.name
      ? `${product.name}（${product.brand}）`
      : product.name;

  return {
    name,
    amount,
    unit: 'g',
    calories: Math.round(product.per100g.calories * ratio),
    protein:
      product.per100g.protein !== undefined ? round1(product.per100g.protein * ratio) : undefined,
    carbs:
      product.per100g.carbs !== undefined ? round1(product.per100g.carbs * ratio) : undefined,
    fat: product.per100g.fat !== undefined ? round1(product.per100g.fat * ratio) : undefined,
    // 包装标签数据比视觉估算可靠
    confidence: 0.95,
    barcode: product.barcode,
  };
}
