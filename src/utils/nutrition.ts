import { FoodItem, FoodLog } from '../types';

// 饮食营养聚合工具：按天 / 按餐汇总三大营养，并计算每公斤体重蛋白摄入

export interface MacroTotals {
  calories: number; // kcal
  protein: number;  // g
  carbs: number;    // g
  fat: number;      // g
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const round1 = (v: number) => Math.round(v * 10) / 10;

export function macrosOfItems(items: FoodItem[]): MacroTotals {
  return (items || []).reduce<MacroTotals>(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// 优先用记录里的汇总值，缺失时回退到条目累加
export function macrosOfLog(log: FoodLog): MacroTotals {
  const fromItems = macrosOfItems(log.items);
  const total = log.total;
  return {
    calories: total?.calories ?? fromItems.calories,
    protein: total?.protein ?? fromItems.protein,
    carbs: total?.carbs ?? fromItems.carbs,
    fat: total?.fat ?? fromItems.fat,
  };
}

export function sumMacros(logs: FoodLog[]): MacroTotals {
  return (logs || []).reduce<MacroTotals>(
    (acc, log) => {
      const m = macrosOfLog(log);
      return {
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export interface DailyNutritionRow extends MacroTotals {
  date: string;        // YYYY-MM-DD
  label: string;       // 11/26
  weekday: string;     // 周四
  mealCount: number;   // 当天记录了几餐
  proteinPerKg?: number;
}

// 连续 days 天（升序），没有记录的天补 0，便于画折线
export function buildDailyNutrition(params: {
  logs: FoodLog[];
  days: number;
  bodyWeight?: number;
}): DailyNutritionRow[] {
  const { logs, days, bodyWeight } = params;
  const rows: DailyNutritionRow[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];
    const dayLogs = logs.filter((l) => l.date === date);
    const m = sumMacros(dayLogs);

    rows.push({
      date,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: WEEKDAYS[d.getDay()],
      mealCount: dayLogs.length,
      calories: Math.round(m.calories),
      protein: round1(m.protein),
      carbs: round1(m.carbs),
      fat: round1(m.fat),
      proteinPerKg:
        bodyWeight && bodyWeight > 0 ? round1(m.protein / bodyWeight) : undefined,
    });
  }

  return rows;
}

// 三大营养供能占比（蛋白 4 kcal/g、碳水 4、脂肪 9）
export function macroEnergyShare(m: MacroTotals): { protein: number; carbs: number; fat: number } {
  const p = m.protein * 4;
  const c = m.carbs * 4;
  const f = m.fat * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const pct = (v: number) => Math.round((v / total) * 100);
  return { protein: pct(p), carbs: pct(c), fat: pct(f) };
}
