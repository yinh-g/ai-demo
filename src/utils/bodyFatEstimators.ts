// 体脂「间接推算」工具
// 说明：这些公式只能给出粗略估计，误差通常在 ±4% 以上，
// 因此在多源融合中对应较高的 sigma（低权重），仅用于补充趋势。

const clamp = (v: number, min = 2, max = 60) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

// 美国海军围度公式（需要腰围 + 颈围，女性还需臀围）
function navyBodyFat(params: {
  waistCm: number;
  heightCm: number;
  gender: 'male' | 'female';
  neckCm?: number;
  hipCm?: number;
}): number | null {
  const { waistCm, heightCm, gender, neckCm, hipCm } = params;
  if (gender === 'male') {
    if (!neckCm || waistCm - neckCm <= 0) return null;
    const v =
      86.01 * Math.log10(waistCm - neckCm) -
      70.041 * Math.log10(heightCm) +
      36.76;
    return Number.isFinite(v) ? clamp(v) : null;
  }
  if (!neckCm || !hipCm || waistCm + hipCm - neckCm <= 0) return null;
  const v =
    163.205 * Math.log10(waistCm + hipCm - neckCm) -
    97.684 * Math.log10(heightCm) -
    78.387;
  return Number.isFinite(v) ? clamp(v) : null;
}

// 兜底：腰围 + 年龄的经验回归（无需颈围/臀围）
function waistAgeBodyFat(params: {
  waistCm: number;
  gender: 'male' | 'female';
  age?: number;
}): number {
  const { waistCm, gender, age = 30 } = params;
  const v =
    gender === 'male'
      ? 0.567 * waistCm + 0.101 * age - 31.8
      : 0.439 * waistCm + 0.221 * age - 9.4;
  return clamp(v);
}

// 腰围推算体脂率（%）。数据不足或明显异常时返回 null
export function estimateBodyFatFromWaist(params: {
  waistCm: number;
  heightCm?: number;
  gender?: 'male' | 'female';
  age?: number;
  neckCm?: number;
  hipCm?: number;
}): number | null {
  const { waistCm, heightCm, gender = 'male', age, neckCm, hipCm } = params;
  if (!Number.isFinite(waistCm) || waistCm < 40 || waistCm > 200) return null;

  if (heightCm && Number.isFinite(heightCm) && heightCm > 100 && heightCm < 250) {
    const navy = navyBodyFat({ waistCm, heightCm, gender, neckCm, hipCm });
    if (navy !== null) return round1(navy);
  }
  return round1(waistAgeBodyFat({ waistCm, gender, age }));
}

// 腰高比：>0.5 提示中心性肥胖风险，可用于文案提示
export function waistToHeightRatio(waistCm: number, heightCm?: number): number | null {
  if (!heightCm || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  return Math.round((waistCm / heightCm) * 100) / 100;
}
