import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { getCurrentUser } from '../auth';
import { FoodItem } from '../../types';

// 识别结果（Edge Function 返回）
export interface AnalyzeFoodResult {
  items: FoodItem[];
  note?: string;
  transcript?: string; // 语音转写文本（仅语音输入时有）
}

export interface AnalyzeFoodParams {
  photoUri?: string;
  text?: string;
  previousItems?: FoodItem[];
  audioUri?: string;
}

// 压缩目标：最长边 1024px、JPEG、压缩率 0.6
const MAX_IMAGE_WIDTH = 1024;
const JPEG_COMPRESS = 0.6;

interface AnalyzeBody {
  imageBase64?: string;
  mimeType?: string;
  text?: string;
  previousItems?: FoodItem[];
  audioBase64?: string;
  audioFormat?: string;
}

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

// 读取录音文件并转成 base64
async function readAudioBase64(uri: string): Promise<{ base64: string; format: string }> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const lower = uri.toLowerCase();
  const format = lower.endsWith('.3gp')
    ? '3gp'
    : lower.endsWith('.wav')
    ? 'wav'
    : lower.endsWith('.webm')
    ? 'webm'
    : lower.endsWith('.mp3')
    ? 'mp3'
    : 'm4a';
  return { base64, format };
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

async function invokeAnalyze(body: AnalyzeBody): Promise<AnalyzeFoodResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法使用识别');
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('请先登录后再使用识别');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('analyze-food', { body });

  if (error) {
    // supabase-js 只给出通用 message，真实响应体在 error.context 中
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
      throw new Error('识别服务未部署，请先部署 analyze-food 云函数');
    }
    if (detail) {
      throw new Error(detail);
    }
    throw new Error(`识别服务调用失败（HTTP ${status ?? '未知'}）`);
  }

  const payload = data as
    | { ok?: boolean; items?: unknown[]; note?: string; error?: string; transcript?: string }
    | null;
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
    throw new Error('未识别到食物，请换一张照片或补充文字描述');
  }

  return { items, note: payload.note, transcript: payload.transcript };
}

// 统一入口：图片 / 文字 / 语音 / 基于已有结果的重新校准
export async function analyzeFood(params: AnalyzeFoodParams): Promise<AnalyzeFoodResult> {
  const body: AnalyzeBody = {};

  if (params.text && params.text.trim()) {
    body.text = params.text.trim();
  }
  if (params.previousItems && params.previousItems.length > 0) {
    body.previousItems = params.previousItems;
  }
  if (params.photoUri) {
    body.imageBase64 = await compressToBase64(params.photoUri);
    body.mimeType = 'image/jpeg';
  }
  if (params.audioUri) {
    const { base64, format } = await readAudioBase64(params.audioUri);
    body.audioBase64 = base64;
    body.audioFormat = format;
  }

  return invokeAnalyze(body);
}

// 兼容原有调用
export async function analyzeFoodPhoto(localUri: string): Promise<AnalyzeFoodResult> {
  return analyzeFood({ photoUri: localUri });
}

// 基于当前结果 + 用户文字进行 AI 重新校准
export async function recalibrateFood(params: {
  items: FoodItem[];
  text: string;
  photoUri?: string;
}): Promise<AnalyzeFoodResult> {
  return analyzeFood({
    previousItems: params.items,
    text: params.text,
    photoUri: params.photoUri,
  });
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
