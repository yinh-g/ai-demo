import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { getCurrentUser } from './auth';

// 拍照估算体脂率
// 注意：照片估算是所有来源里误差最大的（光线/角度/衣着/肌肉量都会影响），
// 在融合中只给低权重（SOURCE_SIGMA.photo），结果仅作趋势参考。

export interface PhotoBodyFatEstimate {
  bodyFat: number;
  low: number;
  high: number;
  confidence: number; // 0-1
  note?: string;
}

const MAX_IMAGE_WIDTH = 1024;
const JPEG_COMPRESS = 0.7;

async function compressToBase64(localUri: string): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_IMAGE_WIDTH, height: null });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    base64: true,
    compress: JPEG_COMPRESS,
  });
  if (!saved.base64) throw new Error('图片压缩失败，请重试');
  return saved.base64;
}

const clampPct = (v: number) => Math.max(3, Math.min(60, v));

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export async function estimateBodyFatFromPhoto(localUri: string): Promise<PhotoBodyFatEstimate> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法使用拍照估算');
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('请先登录后再使用拍照估算');
  }

  const imageBase64 = await compressToBase64(localUri);
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('estimate-body-fat', {
    body: { imageBase64, mimeType: 'image/jpeg' },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    const status = ctx?.status;
    let detail = '';
    if (ctx && typeof ctx.json === 'function') {
      try {
        const b = (await ctx.json()) as { error?: string };
        detail = b?.error || '';
      } catch {
        // 响应不是 JSON，忽略
      }
    }
    if (status === 404) {
      throw new Error('估算服务未部署，请先部署 estimate-body-fat 云函数');
    }
    if (detail) throw new Error(detail);
    throw new Error(`估算服务调用失败（HTTP ${status ?? '未知'}）`);
  }

  const payload = data as
    | {
        ok?: boolean;
        bodyFat?: unknown;
        range?: { low?: unknown; high?: unknown };
        confidence?: unknown;
        note?: string;
        error?: string;
      }
    | null;
  if (!payload) throw new Error('估算服务返回为空');
  if (payload.ok === false) throw new Error(payload.error || '估算失败，请稍后重试');

  const bodyFat = num(payload.bodyFat);
  if (bodyFat === undefined) throw new Error('估算结果无效，请换一张照片重试');

  const low = num(payload.range?.low);
  const high = num(payload.range?.high);
  const confidence = num(payload.confidence);

  return {
    bodyFat: Math.round(clampPct(bodyFat) * 10) / 10,
    low: Math.round(clampPct(low ?? bodyFat - 3) * 10) / 10,
    high: Math.round(clampPct(high ?? bodyFat + 3) * 10) / 10,
    confidence: confidence !== undefined ? Math.min(1, Math.max(0, confidence)) : 0.4,
    note: payload.note,
  };
}
