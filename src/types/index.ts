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
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'cardio_machine' | 'none';
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

// 用户资料
export interface UserProfile {
  id: string;
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
}

// 减脂预测结果
export interface FatLossPrediction {
  id: string;
  userId: string;
  date: string;
  weeklyCardioCalories: number;
  predictedMonthlyFatLoss: number;
  predictedWeeklyFatLoss: number;
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
