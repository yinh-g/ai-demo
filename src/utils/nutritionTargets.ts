import { UserProfile, WorkoutRecord } from '../types';
import { calculateBMR, calculateActivityLevel } from './fatLossPrediction';
import { MacroTotals, round1 } from './nutrition';

// 按体重与减脂/增肌目标推导每日三大营养目标，并对实际摄入做高低校验

export type NutritionGoal = 'cut' | 'bulk' | 'recomp' | 'maintain';

export interface NutritionTarget {
  goal: NutritionGoal;
  goalLabel: string;
  weight: number;    // 计算所用体重（kg）
  calories: number;
  protein: number;   // 每日总克数
  carbs: number;     // g
  fat: number;       // g
  proteinPerKg: number;
  bmr: number;
  tdee: number;
}

const GOAL_META: Record<
  NutritionGoal,
  { label: string; kcalFactor: number; proteinPerKg: number }
> = {
  cut: { label: '减脂', kcalFactor: 0.8, proteinPerKg: 2.0 },
  recomp: { label: '减脂增肌', kcalFactor: 0.9, proteinPerKg: 1.9 },
  bulk: { label: '增肌', kcalFactor: 1.1, proteinPerKg: 1.8 },
  maintain: { label: '维持', kcalFactor: 1.0, proteinPerKg: 1.6 },
};

const MIN_WEIGHT = 30;
const MAX_WEIGHT = 300;

// 体重合理性校验：超出 30-300kg 视为脏数据（单位填错、多打一个 0 等）
export function safeBodyWeight(
  primary?: number | null,
  fallback?: number | null
): number | undefined {
  const ok = (v?: number | null): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= MIN_WEIGHT && v <= MAX_WEIGHT;
  if (ok(primary)) return primary;
  if (ok(fallback)) return fallback;
  return undefined;
}

// 蛋白目标解析：兼容把「每日总克数」误填进 g/kg 字段的情况
// <=5 视为 g/kg；>=30 视为每日总克数；中间模糊值按 g/kg 收敛到 4g/kg 上限
function resolveProtein(
  raw: number,
  weight: number,
  defaultPerKg: number
): { grams: number; perKg: number } {
  if (!Number.isFinite(raw) || raw <= 0) {
    return { grams: Math.round(weight * defaultPerKg), perKg: defaultPerKg };
  }
  if (raw <= 5) {
    const perKg = Math.min(4, Math.max(0.8, raw));
    return { grams: Math.round(weight * perKg), perKg };
  }
  if (raw >= 30) {
    const grams = Math.min(400, Math.max(30, raw));
    return { grams: Math.round(grams), perKg: Math.round((grams / weight) * 10) / 10 };
  }
  const perKg = Math.min(4, raw);
  return { grams: Math.round(weight * perKg), perKg };
}

// 目标判定：同时设了减脂与增肌目标视为身体重组；没设目标时按体脂率兜底
export function detectGoal(profile: UserProfile, bodyFat?: number): NutritionGoal {
  const fatGoal = profile.fatLossGoal ?? 0;
  const gainGoal = profile.muscleGainGoal ?? 0;
  if (fatGoal > 0 && gainGoal > 0) return 'recomp';
  if (fatGoal > 0) return 'cut';
  if (gainGoal > 0) return 'bulk';

  const bf = bodyFat ?? profile.bodyFat;
  // 设了目标体脂且当前明显高于目标 → 按减脂处理
  if (bf !== undefined && profile.targetBodyFat !== undefined && bf > profile.targetBodyFat + 1) {
    return 'cut';
  }
  if (bf !== undefined) {
    if (profile.gender === 'male' ? bf > 20 : bf > 28) return 'cut';
  }
  return 'maintain';
}

// 用近 7 天训练分钟数推导活动系数
export function activityFactorFromRecords(records: WorkoutRecord[]): number {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = records.filter(
    (r) => r.status === 'completed' && new Date(r.date).getTime() >= since
  );
  const cardio = recent
    .filter((r) => r.workoutType === 'cardio')
    .reduce((sum, r) => sum + (r.duration || 0), 0);
  const strength = recent
    .filter((r) => r.workoutType === 'strength')
    .reduce((sum, r) => sum + (r.duration || 0), 0);
  return calculateActivityLevel(cardio, strength);
}

export function buildNutritionTarget(params: {
  profile: UserProfile | null;
  bodyWeight?: number;
  bodyFat?: number;
  activityFactor?: number;
  tdeeFactor?: number;
}): NutritionTarget | null {
  const {
    profile,
    bodyWeight,
    bodyFat,
    activityFactor = 1.375,
    tdeeFactor = 1,
  } = params;

  if (!profile) return null;
  const weight = safeBodyWeight(bodyWeight, profile.weight);
  if (!weight) return null;

  const goal = detectGoal(profile, bodyFat);
  const meta = GOAL_META[goal];

  const bmr = Math.round(calculateBMR(weight, profile.height, profile.age, profile.gender));
  const tdee = Math.round(bmr * activityFactor * (tdeeFactor > 0 ? tdeeFactor : 1));

  // 手填热量仅在 800-6000 kcal 的合理区间内采用
  const manualCalories = profile.dailyCalorieIntake ?? 0;
  const useManualCalories = manualCalories >= 800 && manualCalories <= 6000;
  const calories = useManualCalories
    ? Math.round(manualCalories)
    : Math.round(tdee * meta.kcalFactor);

  // 手填蛋白：兼容 g/kg 与「每日总克数」两种填法，异常值不会放大成几千克
  const proteinTarget = resolveProtein(profile.proteinIntake ?? 0, weight, meta.proteinPerKg);
  const proteinPerKg = proteinTarget.perKg;
  const protein = proteinTarget.grams;

  // 脂肪取 25% 热量，且不低于 0.6g/kg
  const fat = Math.round(Math.max((calories * 0.25) / 9, weight * 0.6));

  // 碳水吃掉剩余热量
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    goal,
    goalLabel: meta.label,
    weight,
    calories,
    protein,
    carbs,
    fat,
    proteinPerKg: round1(proteinPerKg),
    bmr,
    tdee,
  };
}

export type MacroStatus = 'low' | 'ok' | 'high';

export interface MacroCheck {
  key: 'protein' | 'fat' | 'carbs' | 'calories';
  label: string;
  actual: number;
  target: number;
  unit: string;
  ratio: number;      // 实际 / 目标
  status: MacroStatus;
  message: string;
}

// 阈值：热量 ±10% 达标；蛋白 85%-135%；脂肪 70%-125%；碳水 70%-130%
export function evaluateMacros(actual: MacroTotals, target: NutritionTarget): MacroCheck[] {
  const build = (
    key: MacroCheck['key'],
    label: string,
    a: number,
    t: number,
    unit: string,
    lowRatio: number,
    highRatio: number,
    lowMsg: string,
    highMsg: string
  ): MacroCheck => {
    const ratio = t > 0 ? a / t : 0;
    const status: MacroStatus = ratio < lowRatio ? 'low' : ratio > highRatio ? 'high' : 'ok';
    return {
      key,
      label,
      actual: Math.round(a),
      target: Math.round(t),
      unit,
      ratio,
      status,
      message: status === 'low' ? lowMsg : status === 'high' ? highMsg : '达标',
    };
  };

  return [
    build(
      'protein',
      '蛋白质',
      actual.protein,
      target.protein,
      'g',
      0.85,
      1.35,
      `蛋白不足，建议再补 ${Math.max(0, Math.round(target.protein - actual.protein))}g 左右`,
      '蛋白偏高，注意别挤占碳水和总热量'
    ),
    build(
      'fat',
      '脂肪',
      actual.fat,
      target.fat,
      'g',
      0.7,
      1.25,
      '脂肪偏低，长期过低可能影响激素与恢复',
      '脂肪偏高，留意烹调油、坚果和酱料'
    ),
    build(
      'carbs',
      '碳水',
      actual.carbs,
      target.carbs,
      'g',
      0.7,
      1.3,
      '碳水偏低，训练日容易乏力',
      '碳水偏高，留意精制糖与主食份量'
    ),
    build(
      'calories',
      '总热量',
      actual.calories,
      target.calories,
      'kcal',
      0.9,
      1.1,
      '总热量偏低，可能影响恢复与代谢',
      '总热量偏高，减脂期容易停滞'
    ),
  ];
}

export function statusColor(status: MacroStatus): string {
  if (status === 'low') return '#F59E0B';
  if (status === 'high') return '#EF4444';
  return '#10B981';
}
