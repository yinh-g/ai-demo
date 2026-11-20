import { BodyMeasurement, CalibrationState, PredictionSnapshot } from '../types';
import { daysBetween, getWeightChange } from './bodyTrend';

const KCAL_PER_KG = 7700;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// 指数移动平均：让校准系数平滑更新，避免单次波动导致跳变
export function ema(prev: number, observed: number, alpha = 0.25): number {
  return alpha * observed + (1 - alpha) * prev;
}

// 用“实际体重变化 + 实际摄入”反推真实 TDEE
// 能量守恒：ΔW * 7700 = (摄入 - TDEE) * 天数  =>  TDEE = 摄入 - ΔW*7700/天数
export function estimateActualTDEE(params: {
  measurements: BodyMeasurement[];
  avgDailyIntake: number;
  windowDays?: number;
}): { tdee: number; spanDays: number } | null {
  const { measurements, avgDailyIntake, windowDays = 21 } = params;
  if (avgDailyIntake <= 0) return null;

  const change = getWeightChange(measurements, windowDays);
  if (!change || change.spanDays < 7) return null;

  const tdee = avgDailyIntake - (change.delta * KCAL_PER_KG) / change.spanDays;
  if (!Number.isFinite(tdee) || tdee < 800 || tdee > 6000) return null;

  return { tdee, spanDays: change.spanDays };
}

// 构建/更新校准状态
export function buildCalibration(params: {
  measurements: BodyMeasurement[];
  avgDailyIntake: number;
  formulaTDEE: number;
  prev?: CalibrationState | null;
  windowDays?: number;
}): CalibrationState | null {
  const { measurements, avgDailyIntake, formulaTDEE, prev, windowDays = 21 } = params;
  if (formulaTDEE <= 0) return null;

  const actual = estimateActualTDEE({ measurements, avgDailyIntake, windowDays });
  if (!actual) return null;

  const observedFactor = clamp(actual.tdee / formulaTDEE, 0.6, 1.6);
  const prevFactor = prev?.tdeeFactor ?? 1;

  // 样本越长，越信任观测值
  const alpha = clamp(actual.spanDays / 56, 0.15, 0.5);
  const tdeeFactor = round2(ema(prevFactor, observedFactor, alpha));

  // 置信度随样本天数增长，封顶 0.95
  const confidence = round2(clamp(actual.spanDays / 28, 0, 0.95));

  return {
    tdeeFactor,
    muscleGainFactor: prev?.muscleGainFactor ?? 1,
    sampleDays: actual.spanDays,
    confidence,
    updatedAt: Date.now(),
  };
}

// 预测误差：对历史快照，比较“当时的每周减脂预测”和“此后实际体重变化”
export function computePredictionError(params: {
  snapshots: PredictionSnapshot[];
  measurements: BodyMeasurement[];
  minDays?: number;
}): { meanAbsPercent: number; meanAbsKg: number; samples: number } | null {
  const { snapshots, measurements, minDays = 14 } = params;
  if (snapshots.length === 0 || measurements.length === 0) return null;

  const sorted = [...measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
  const pcts: number[] = [];
  const kgs: number[] = [];

  for (const snap of snapshots) {
    // 找到快照之后至少 minDays 天的最近一条测量
    const later = sorted.find((m) => m.date > snap.date && daysBetween(snap.date, m.date) >= minDays);
    if (!later) continue;

    const spanDays = daysBetween(snap.date, later.date);
    const actualWeekly = ((snap.weightAtPrediction - later.weight) / spanDays) * 7;

    // 预测本身接近 0 时跳过（百分比误差无意义）
    if (Math.abs(snap.predictedWeeklyFatLoss) < 0.02) continue;

    const pct = Math.abs(actualWeekly - snap.predictedWeeklyFatLoss) / Math.abs(snap.predictedWeeklyFatLoss);
    pcts.push(Math.min(1.5, pct));
    kgs.push(Math.abs(actualWeekly - snap.predictedWeeklyFatLoss));
  }

  if (pcts.length === 0) return null;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    meanAbsPercent: Math.round(avg(pcts) * 100),
    meanAbsKg: round2(avg(kgs)),
    samples: pcts.length,
  };
}
