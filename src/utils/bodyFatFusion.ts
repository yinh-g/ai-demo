import { BodyFatSample, BodyFatCalibration, BodyFatSource } from '../types';

// 各来源的标准差（越小越可信）
export const SOURCE_SIGMA: Record<BodyFatSource, number> = {
  inbody: 1.5,
  scale: 3.5,
  manual: 3.0,
  waist: 4.0,
  photo: 6.0, // 拍照：低权重
};

export const SOURCE_LABELS: Record<BodyFatSource, string> = {
  inbody: 'InBody/DEXA',
  scale: '体脂秤',
  manual: '手动',
  waist: '腰围推算',
  photo: '拍照估算',
};

const DEFAULT_CALIBRATION: BodyFatCalibration = {
  scaleBias: 0,
  photoBias: 0,
  updatedAt: 0,
};

export function daysAgo(dateStr: string): number {
  const t = new Date(`${dateStr}T00:00:00`).getTime();
  if (!Number.isFinite(t)) return 9999;
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}

// 应用系统偏差校准
export function calibrateValue(sample: BodyFatSample, cal: BodyFatCalibration | null): number {
  const c = cal || DEFAULT_CALIBRATION;
  let v = sample.value;
  if (sample.source === 'scale') v -= c.scaleBias;
  if (sample.source === 'photo') v -= c.photoBias;
  if (sample.source === 'waist' && c.waistBias) v -= c.waistBias;
  return Math.max(2, Math.min(60, v));
}

export interface FusedBodyFat {
  value: number;
  sigma: number; // 综合不确定度
  sampleCount: number;
  contributions: { source: BodyFatSource; value: number; weight: number }[];
}

// 同一来源可能有多条样本，按来源把权重合并，便于 UI 展示“谁在说话”
export interface SourceContribution {
  source: BodyFatSource;
  value: number;   // 该来源校准后的加权均值
  weight: number;  // 占总权重的百分比（0-100）
  count: number;   // 该来源参与融合的样本数
}

export function aggregateContributions(fused: FusedBodyFat | null): SourceContribution[] {
  if (!fused) return [];
  const map = new Map<BodyFatSource, { weighted: number; weight: number; count: number }>();
  fused.contributions.forEach((c) => {
    const cur = map.get(c.source) || { weighted: 0, weight: 0, count: 0 };
    cur.weighted += c.value * c.weight;
    cur.weight += c.weight;
    cur.count += 1;
    map.set(c.source, cur);
  });
  return Array.from(map.entries())
    .map(([source, v]) => ({
      source,
      value: v.weight > 0 ? Math.round((v.weighted / v.weight) * 10) / 10 : 0,
      weight: v.weight,
      count: v.count,
    }))
    .sort((a, b) => b.weight - a.weight);
}

// 同一来源同一天只保留最新一条，避免重复录入把某个来源的权重放大
function dedupeSameDay(samples: BodyFatSample[]): BodyFatSample[] {
  const map = new Map<string, BodyFatSample>();
  samples.forEach((s) => {
    const key = `${s.source}|${s.date}`;
    const cur = map.get(key);
    if (!cur || s.createdAt >= cur.createdAt) map.set(key, s);
  });
  return Array.from(map.values());
}

// 加权融合：权重 = 1/σ² × 时间衰减（越近越重）
export function fuseBodyFat(params: {
  samples: BodyFatSample[];
  calibration: BodyFatCalibration | null;
  windowDays?: number;
  halfLifeDays?: number;
}): FusedBodyFat | null {
  const { samples, calibration, windowDays = 60, halfLifeDays = 21 } = params;
  if (samples.length === 0) return null;

  const recent = dedupeSameDay(samples.filter((s) => daysAgo(s.date) <= windowDays));
  if (recent.length === 0) return null;

  const weighted = recent.map((s) => {
    const sigma = SOURCE_SIGMA[s.source] || 5;
    const decay = Math.pow(0.5, daysAgo(s.date) / halfLifeDays);
    const weight = (1 / (sigma * sigma)) * decay;
    return { source: s.source, value: calibrateValue(s, calibration), weight };
  });

  const totalW = weighted.reduce((a, c) => a + c.weight, 0);
  if (totalW <= 0) return null;

  const value = weighted.reduce((a, c) => a + c.value * c.weight, 0) / totalW;
  const sigma = Math.sqrt(1 / totalW);

  return {
    value: Math.round(value * 10) / 10,
    sigma: Math.round(sigma * 10) / 10,
    sampleCount: recent.length,
    contributions: weighted.map((c) => ({
      source: c.source,
      value: Math.round(c.value * 10) / 10,
      weight: Math.round((c.weight / totalW) * 100),
    })),
  };
}

// 用锚点（InBody/DEXA）计算各设备的系统偏差
export function computeCalibration(params: {
  samples: BodyFatSample[];
  anchor?: { value: number; date: string } | null;
  prev?: BodyFatCalibration | null;
}): BodyFatCalibration {
  const { samples, anchor, prev } = params;
  const base: BodyFatCalibration = prev
    ? { ...prev }
    : { ...DEFAULT_CALIBRATION };

  if (!anchor || anchor.value <= 0) {
    return { ...base, updatedAt: Date.now() };
  }

  const anchorAge = daysAgo(anchor.date);

  // 找距离锚点日期最近的同源样本
  const nearestOf = (source: BodyFatSource): BodyFatSample | undefined => {
    const list = samples.filter((s) => s.source === source);
    if (list.length === 0) return undefined;
    return list.reduce((best, cur) =>
      Math.abs(daysAgo(cur.date) - anchorAge) < Math.abs(daysAgo(best.date) - anchorAge)
        ? cur
        : best
    );
  };

  const scaleSample = nearestOf('scale');
  if (scaleSample) {
    base.scaleBias = Math.round((scaleSample.value - anchor.value) * 10) / 10;
  }

  const photoSample = nearestOf('photo');
  if (photoSample) {
    base.photoBias = Math.round((photoSample.value - anchor.value) * 10) / 10;
  }

  const waistSample = nearestOf('waist');
  if (waistSample) {
    base.waistBias = Math.round((waistSample.value - anchor.value) * 10) / 10;
  }

  base.anchorValue = anchor.value;
  base.anchorDate = anchor.date;
  base.updatedAt = Date.now();
  return base;
}

// 体脂趋势：线性回归求每周变化率（%/周）
export function getBodyFatTrend(params: {
  samples: BodyFatSample[];
  calibration: BodyFatCalibration | null;
  windowDays?: number;
}): { current: number; slopePerWeek: number; points: number } | null {
  const { samples, calibration, windowDays = 30 } = params;
  const recent = dedupeSameDay(samples.filter((s) => daysAgo(s.date) <= windowDays))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (recent.length < 2) return null;

  const points = recent.map((s) => ({ x: -daysAgo(s.date), y: calibrateValue(s, calibration) }));
  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  const cov = points.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0);
  const varX = points.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  if (varX === 0) return null;

  const slopePerDay = cov / varX;
  return {
    current: Math.round(meanY * 10) / 10,
    slopePerWeek: Math.round(slopePerDay * 7 * 100) / 100,
    points: n,
  };
}

// 按日期聚合各来源的最近值（图表用）
export function getBodyFatSeries(
  samples: BodyFatSample[],
  calibration: BodyFatCalibration | null,
  days = 30
): { date: string; fused: number; points: { source: BodyFatSource; value: number }[] }[] {
  const recent = samples.filter((s) => daysAgo(s.date) <= days);
  const byDate = new Map<string, BodyFatSample[]>();
  recent.forEach((s) => {
    const arr = byDate.get(s.date) || [];
    arr.push(s);
    byDate.set(s.date, arr);
  });

  return Array.from(byDate.entries())
    .map(([date, list]) => {
      const fused = fuseBodyFat({ samples: list, calibration, windowDays: 1, halfLifeDays: 1000 });
      return {
        date,
        fused: fused ? fused.value : 0,
        points: list.map((s) => ({ source: s.source, value: Math.round(calibrateValue(s, calibration) * 10) / 10 })),
      };
    })
    .filter((d) => d.fused > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
