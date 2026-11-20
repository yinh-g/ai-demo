import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { getCurrentUser } from '../auth';
import { FoodItem } from '../../types';

// 识别结果（Edge Function 返回）
export interface AnalyzeFoodResult {
  items: FoodItem[];
  note?: string;
}

// 压缩目标：最长边 1024px、JPEG、压缩率 0.6
// 控制 base64 体积，避免超出 Edge Function 请求体上限
const MAX_IMAGE_WIDTH = 1024;
const JPEG_COMPRESS = 0.6;

// 把本地图片压缩并转成 base64（不含 data URI 前缀）
async function compressToBase64(localUri: string): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_IMAGE_WIDTH, height: null });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    base64: true,
    compress: JPEG_COMPRESS,
  });
  if (!saved.base64) {
    throw new Error('图片压缩失败，请重试');
  }
  return saved.base64;
}

// 基础字段清洗，防止模型返回脏数据
function normalizeItem(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return null;

  const num = (v: unknown): number | undefined => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };

  const calories = num(r.calories);
  if (calories === undefined) return null;

  const unit = r.unit === 'ml' || r.unit === 'piece' || r.unit === 'bowl' ? r.unit : 'g';
  const confidence = num(r.confidence);
  const amount = num(r.amount);

  return {
    name,
    amount: amount !== undefined && amount > 0 ? amount : 100,
    unit,
    calories: Math.max(0, Math.round(calories)),
    protein: num(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    confidence: confidence !== undefined ? Math.min(1, Math.max(0, confidence)) : 0.5,
  };
}

// 拍照识别食物：压缩 → 调 Edge Function → 返回结构化食物列表
export async function analyzeFoodPhoto(localUri: string): Promise<AnalyzeFoodResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法使用拍照识别');
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('请先登录后再使用拍照识别');
  }

  const imageBase64 = await compressToBase64(localUri);
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageBase64, mimeType: 'image/jpeg' },
  });

  if (error) {
    // 函数未部署时通常是 404
    const message = error.message || '识别服务调用失败';
    throw new Error(
      message.includes('404') || message.includes('not found')
        ? '识别服务未部署，请先部署 analyze-food 云函数'
        : message
    );
  }

  const payload = data as { ok?: boolean; items?: unknown[]; note?: string; error?: string } | null;
  if (!payload) {
    throw new Error('识别服务返回为空');
  }
  if (payload.ok === false) {
    throw new Error(payload.error || '识别失败，请稍后重试');
  }

  const items = (payload.items || [])
    .map(normalizeItem)
    .filter((item): item is FoodItem => item !== null);

  if (items.length === 0) {
    throw new Error('未识别到食物，请换一张更清晰的照片');
  }

  return { items, note: payload.note };
}

// 汇总一组食物条目的营养值
export function sumNutrition(items: FoodItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
