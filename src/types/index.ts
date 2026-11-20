// 训练类型
export type WorkoutType = 'strength' | 'cardio';

// 有氧活动类型
export type CardioActivity = 'running' | 'cycling' | 'incline_walk' | 'rowing';

// 动作类型
export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroup: string[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'kettlebell' | 'cardio' | 'cardio_machine' | 'none';
  isCustom: boolean;
  createdAt: number;
}

// 计划中的动作
export interface PlanExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  restTime: number;
  note?: string;
  order: number;
}

// 训练计划
export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  isTemplate: boolean;
  createdAt: number;
  updatedAt: number;
}

// 组记录（力量训练）
export interface SetRecord {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  restTime: number;
}

// 有氧分段记录
export interface CardioSegment {
  segmentNumber: number;
  duration: number;
  distance?: number;
  avgSpeed?: number;
  avgHeartRate?: number;
  calories?: number;
  incline?: number;
  resistance?: number;
  isCompleted: boolean;
}

// 动作记录
export interface ExerciseRecord {
  exerciseId: string;
  sets?: SetRecord[];
  cardioSegments?: CardioSegment[];
  note?: string;
}

// 训练记录
export interface WorkoutRecord {
  id: string;
  planId?: string;
  workoutType: WorkoutType;
  activityType?: CardioActivity;
  date: string;
  startTime: number;
  endTime?: number;
  duration: number;
  exercises: ExerciseRecord[];
  totalVolume: number;
  totalDistance?: number;
  totalCalories?: number;
  status: 'completed' | 'cancelled';
}

// 每日活动数据
export interface DailyActivity {
  date: string;
  steps: number;
  activeCalories: number;
  distanceKm: number;
  source: 'manual' | 'health_connect';
  updatedAt: number;
}

// 用户资料
export interface UserProfile {
  id: string;
  nickname?: string;
  avatarColor?: string;
  avatarUri?: string;
  weight: number;
  height?: number;
  bodyFat?: number;
  age: number;
  gender: 'male' | 'female';
  trainingYears: number;
  proteinIntake: number;
  sleepHours: number;
  muscleGainGoal?: number;
  dailyCalorieIntake?: number;
  fatLossGoal?: number;
  targetBodyFat?: number;
  createdAt: number;
  updatedAt: number;
}

// 肌肉增长预测
export interface MuscleGrowthPrediction {
  id: string;
  userId: string;
  date: string;
  weeklyVolume: number;
  predictedMonthlyGain: number;
  predictedYearlyGain: number;
  monthlyRange?: { min: number; max: number }; // 置信区间
  confidence: number;
  factors: {
    baseGrowthRate: number;
    ageFactor: number;
    genderFactor: number;
    volumeFactor: number;
    nutritionFactor: number;
    recoveryFactor: number;
  };
}

// 预测输入
export interface MuscleGrowthInput {
  userWeight: number;
  age: number;
  gender: 'male' | 'female';
  trainingYears: number;
  weeklyVolume: number;
  proteinIntake: number;
  sleepHours: number;
  muscleGainFactor?: number; // 个体校准系数（默认 1）
}

// 减脂预测输入
export interface FatLossInput {
  userWeight: number;
  age: number;
  gender: 'male' | 'female';
  height?: number;
  bodyFat?: number;
  weeklyCardioMinutes: number;
  weeklyCardioCalories: number;
  weeklyStrengthMinutes: number;
  dailyCalorieIntake: number;
  proteinIntake: number;
  sleepHours: number;
  tdeeFactor?: number; // 个体校准系数（默认 1）
}

// 减脂预测结果
export interface FatLossPrediction {
  id: string;
  userId: string;
  date: string;
  weeklyCardioCalories: number;
  predictedMonthlyFatLoss: number;
  predictedWeeklyFatLoss: number;
  weeklyRange?: { min: number; max: number }; // 置信区间
  predictedWeeklyCalorieDeficit: number;
  timeToGoal?: number;
  confidence: number;
  factors: {
    bmrFactor: number;
    activityFactor: number;
    dietFactor: number;
    proteinFactor: number;
    sleepFactor: number;
    genderFactor: number;
  };
}

// 身体成分重组预测（联动结果）
export interface BodyRecompositionPrediction {
  muscleGain: MuscleGrowthPrediction;
  fatLoss: FatLossPrediction;
  netWeightChange: number;
  bodyCompositionScore: number;
  recommendations: string[];
}

// ────────────────────────────────────────────────────────────
// 身体测量时序 + 预测校准
// ────────────────────────────────────────────────────────────

// 一次身体测量记录（体重必填，体脂/腰围可选）
export interface BodyMeasurement {
  id: string;
  date: string;          // YYYY-MM-DD
  weight: number;        // kg
  bodyFat?: number;      // %
  waist?: number;        // cm
  note?: string;
  createdAt: number;
}

// 预测快照：用于事后对比“预测 vs 实际”
export interface PredictionSnapshot {
  id: string;
  date: string;
  weightAtPrediction: number;
  bodyFatAtPrediction?: number;
  predictedWeeklyFatLoss: number;     // kg/周
  predictedMonthlyMuscleGain: number; // kg/月
  createdAt: number;
}

// 个体校准状态：用实际结果反推的修正系数
export interface CalibrationState {
  tdeeFactor: number;         // 实际 TDEE / 公式 TDEE
  muscleGainFactor: number;   // 实际增肌 / 公式增肌
  sampleDays: number;         // 参与校准的天数
  confidence: number;         // 0-1
  updatedAt: number;
}

// ────────────────────────────────────────────────────────────
// 饮食记录（拍照识别食物热量）
// ────────────────────────────────────────────────────────────

// 餐次
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// 营养信息（单份或汇总）
export interface NutritionFacts {
  calories: number; // kcal
  protein?: number; // g
  carbs?: number;   // g
  fat?: number;     // g
}

// 单个食物条目（AI 识别或手动录入）
export interface FoodItem extends NutritionFacts {
  name: string;
  amount: number;                                // 数量
  unit: 'g' | 'ml' | 'piece' | 'bowl';           // 单位
  confidence: number;                            // 识别置信度 0-1
}

// 一条饮食记录（对应一餐）
export interface FoodLog {
  id: string;
  date: string;              // YYYY-MM-DD
  mealType: MealType;
  items: FoodItem[];
  total: NutritionFacts;     // 本条记录的营养汇总
  source: 'ai' | 'manual';
  createdAt: number;
  updatedAt: number;
}
