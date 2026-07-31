// 动作类型
export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroup: string[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable';
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

// 组记录
export interface SetRecord {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  restTime: number;
}

// 动作记录
export interface ExerciseRecord {
  exerciseId: string;
  sets: SetRecord[];
  note?: string;
}

// 训练记录
export interface WorkoutRecord {
  id: string;
  planId: string;
  date: string;
  startTime: number;
  endTime?: number;
  duration: number;
  exercises: ExerciseRecord[];
  totalVolume: number;
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
