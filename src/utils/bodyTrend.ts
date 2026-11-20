import { BodyMeasurement } from '../types';

// 两个 YYYY-MM-DD 之间相差的天数
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round(Math.abs(db - da) / 86400000);
}

// 按日期升序（同一天按创建时间）
export function sortAsc(ms: BodyMeasurement[]): BodyMeasurement[] {
  return [...ms].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt));
}

// 过滤异常值：相邻记录体重突变超过阈值视为异常（保留前一条）
export function filterOutliers(ms: BodyMeasurement[], maxChange = 2.5): BodyMeasurement[] {
  const sorted = sortAsc(ms);
  const result: BodyMeasurement[] = [];
  for (const m of sorted) {
    if (result.length === 0) {
      result.push(m);
      continue;
    }
    const prev = result[result.length - 1];
    if (Math.abs(m.weight - prev.weight) <= maxChange) {
      result.push(m);
    }
  }
  return result;
}

export function getLatest(ms: BodyMeasurement[]): BodyMeasurement | null {
  const sorted = sortAsc(ms);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

// 最近 N 条记录的平均体重（趋势值，削弱单日水分波动）
export function getWeightTrend(ms: BodyMeasurement[], window = 7): number | null {
  const clean = filterOutliers(ms);
  if (clean.length === 0) return null;
  const recent = clean.slice(-window);
  const avg = recent.reduce((s, m) => s + m.weight, 0) / recent.length;
  return Math.round(avg * 10) / 10;
}

// 最近 N 天内的体重变化
export function getWeightChange(
  ms: BodyMeasurement[],
  days: number
): { delta: number; spanDays: number; first: BodyMeasurement; last: BodyMeasurement } | null {
  const clean = filterOutliers(ms);
  if (clean.length < 2) return null;

  const last = clean[clean.length - 1];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const windowed = clean.filter((m) => m.date >= cutoffStr);
  const first = windowed.length >= 2 ? windowed[0] : clean[0];
  const spanDays = daysBetween(first.date, last.date);
  if (spanDays <= 0) return null;

  return { delta: last.weight - first.weight, spanDays, first, last };
}

// 最近 N 天的体重序列（图表用）
export function getWeightSeries(ms: BodyMeasurement[], days = 30): { date: string; weight: number }[] {
  const clean = filterOutliers(ms);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return clean.filter((m) => m.date >= cutoffStr).map((m) => ({ date: m.date, weight: m.weight }));
}
