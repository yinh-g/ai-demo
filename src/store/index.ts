import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, WorkoutPlan, WorkoutRecord, UserProfile, CardioActivity, WorkoutType, DailyActivity, FoodLog, NutritionFacts, BodyMeasurement, PredictionSnapshot, CalibrationState } from '../types';

// 近 N 天饮食营养统计
export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionStats {
  days: number;          // 实际有记录的天数
  avgCalories: number;   // 有记录天的日均摄入
  avgProtein: number;    // g
  avgCarbs: number;      // g
  avgFat: number;        // g
  daily: DailyNutrition[]; // 按日期倒序
}

interface AppState {
  // 用户资料
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;

  // 动作库
  exercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
  updateExercise: (id: string, exercise: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;

  // 训练计划
  workoutPlans: WorkoutPlan[];
  addWorkoutPlan: (plan: WorkoutPlan) => void;
  updateWorkoutPlan: (id: string, plan: Partial<WorkoutPlan>) => void;
  deleteWorkoutPlan: (id: string) => void;

  // 训练记录
  workoutRecords: WorkoutRecord[];
  addWorkoutRecord: (record: WorkoutRecord) => void;
  updateWorkoutRecord: (id: string, record: Partial<WorkoutRecord>) => void;
  deleteWorkoutRecord: (id: string) => void;

  // 当前训练（力量）
  currentWorkout: WorkoutRecord | null;
  startWorkout: (planId: string) => void;
  updateCurrentWorkout: (record: Partial<WorkoutRecord>) => void;
  endWorkout: () => void;
  cancelWorkout: () => void;

  // 当前有氧训练
  currentCardio: WorkoutRecord | null;
  startCardio: (activity: CardioActivity) => void;
  pauseCardio: () => void;
  resumeCardio: () => void;
  endCardio: (data: { duration: number; distance?: number; calories?: number }) => void;
  cancelCardio: () => void;

  // 每日活动数据
  dailyActivities: DailyActivity[];
  setDailyActivity: (activity: DailyActivity) => void;
  getTodayActivity: () => DailyActivity | undefined;

  // 饮食记录（拍照识别食物热量）
  foodLogs: FoodLog[];
  addFoodLog: (log: FoodLog) => void;
  updateFoodLog: (id: string, log: Partial<FoodLog>) => void;
  deleteFoodLog: (id: string) => void;
  getTodayFoodLogs: () => FoodLog[];
  getTodayNutrition: () => NutritionFacts;
  getFoodLogsByDate: (date: string) => FoodLog[];
  getNutritionStats: (days: number) => NutritionStats;

  // 身体测量时序 + 预测校准
  bodyMeasurements: BodyMeasurement[];
  predictionSnapshots: PredictionSnapshot[];
  calibration: CalibrationState | null;
  addBodyMeasurement: (m: BodyMeasurement) => void;
  deleteBodyMeasurement: (id: string) => void;
  getLatestMeasurement: () => BodyMeasurement | undefined;
  addPredictionSnapshot: (s: PredictionSnapshot) => void;
  setCalibration: (c: CalibrationState | null) => void;

  // 云同步状态
  syncStatus: 'idle' | 'syncing' | 'offline' | 'error';
  setSyncStatus: (status: AppState['syncStatus']) => void;

  // 登录态（运行时，不持久化）。由 sync.login/logout 维护
// 登录态（不持久化）
  authUser: string | null;
  setAuthUser: (user: string | null) => void;

  // 游客模式（不持久化）
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 用户资料
      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),

      // 动作库
      exercises: [],
      addExercise: (exercise) => set((state) => {
        // 防止添加同名动作（忽略大小写和空格）
        const normalizedName = exercise.name.trim().toLowerCase();
        const exists = state.exercises.some(e => e.name.trim().toLowerCase() === normalizedName);
        if (exists) return state;
        return { exercises: [...state.exercises, exercise] };
      }),
      updateExercise: (id, exercise) => set((state) => ({
        exercises: state.exercises.map((e) =>
          e.id === id ? { ...e, ...exercise } : e
        )
      })),
      deleteExercise: (id) => set((state) => ({
        exercises: state.exercises.filter((e) => e.id !== id)
      })),

      // 训练计划
      workoutPlans: [],
      addWorkoutPlan: (plan) => set((state) => ({
        workoutPlans: [...state.workoutPlans, plan]
      })),
      updateWorkoutPlan: (id, plan) => set((state) => ({
        workoutPlans: state.workoutPlans.map((p) =>
          p.id === id ? { ...p, ...plan } : p
        )
      })),
      deleteWorkoutPlan: (id) => set((state) => ({
        workoutPlans: state.workoutPlans.filter((p) => p.id !== id)
      })),

      // 训练记录
      workoutRecords: [],
      addWorkoutRecord: (record) => set((state) => ({
        workoutRecords: [...state.workoutRecords, record]
      })),
      updateWorkoutRecord: (id, record) => set((state) => ({
        workoutRecords: state.workoutRecords.map((r) =>
          r.id === id ? { ...r, ...record } : r
        )
      })),
      deleteWorkoutRecord: (id) => set((state) => ({
        workoutRecords: state.workoutRecords.filter((r) => r.id !== id)
      })),

      // 当前力量训练
      currentWorkout: null,
      startWorkout: (planId) => {
        const plan = get().workoutPlans.find((p) => p.id === planId);
        if (plan) {
          const newRecord: WorkoutRecord = {
            id: Date.now().toString(),
            planId,
            workoutType: 'strength' as WorkoutType,
            date: new Date().toISOString().split('T')[0],
            startTime: Date.now(),
            duration: 0,
            exercises: [],
            totalVolume: 0,
            status: 'completed'
          };
          set({ currentWorkout: newRecord });
        }
      },
      updateCurrentWorkout: (record) => {
        const { currentWorkout } = get();
        if (currentWorkout) {
          set({ currentWorkout: { ...currentWorkout, ...record } });
        }
      },
      endWorkout: () => {
        const { currentWorkout } = get();
        if (currentWorkout) {
          const completedRecord = {
            ...currentWorkout,
            endTime: Date.now(),
            duration: Math.floor((Date.now() - currentWorkout.startTime) / 60000)
          };
          set((state) => ({
            workoutRecords: [...state.workoutRecords, completedRecord],
            currentWorkout: null
          }));
        }
      },
      cancelWorkout: () => {
        const { currentWorkout } = get();
        if (currentWorkout) {
          const cancelledRecord = {
            ...currentWorkout,
            endTime: Date.now(),
            duration: Math.floor((Date.now() - currentWorkout.startTime) / 60000),
            status: 'cancelled' as const
          };
          set((state) => ({
            workoutRecords: [...state.workoutRecords, cancelledRecord],
            currentWorkout: null
          }));
        }
      },

      // 当前有氧训练
      currentCardio: null,
      startCardio: (activity) => {
        const newRecord: WorkoutRecord = {
          id: Date.now().toString(),
          workoutType: 'cardio' as WorkoutType,
          activityType: activity,
          date: new Date().toISOString().split('T')[0],
          startTime: Date.now(),
          duration: 0,
          exercises: [],
          totalVolume: 0,
          status: 'completed'
        };
        set({ currentCardio: newRecord });
      },
      pauseCardio: () => {
        // 暂停逻辑由组件内部计时器处理
      },
      resumeCardio: () => {
        // 恢复逻辑由组件内部计时器处理
      },
      endCardio: (data) => {
        const { currentCardio } = get();
        if (currentCardio) {
          const completedRecord = {
            ...currentCardio,
            endTime: Date.now(),
            duration: data.duration,
            totalDistance: data.distance,
            totalCalories: data.calories
          };
          set((state) => ({
            workoutRecords: [...state.workoutRecords, completedRecord],
            currentCardio: null
          }));
        }
      },
      cancelCardio: () => {
        const { currentCardio } = get();
        if (currentCardio) {
          const cancelledRecord = {
            ...currentCardio,
            endTime: Date.now(),
            duration: Math.floor((Date.now() - currentCardio.startTime) / 60000),
            status: 'cancelled' as const
          };
          set((state) => ({
            workoutRecords: [...state.workoutRecords, cancelledRecord],
            currentCardio: null
          }));
        }
      },

      // 每日活动数据
      dailyActivities: [],
      setDailyActivity: (activity) => set((state) => {
        const filtered = state.dailyActivities.filter(a => a.date !== activity.date);
        return { dailyActivities: [...filtered, activity] };
      }),
      getTodayActivity: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().dailyActivities.find(a => a.date === today);
      },

      // 饮食记录（拍照识别食物热量）
      foodLogs: [],
      addFoodLog: (log) => set((state) => ({
        foodLogs: [...state.foodLogs, log]
      })),
      updateFoodLog: (id, log) => set((state) => ({
        foodLogs: state.foodLogs.map((l) => l.id === id ? { ...l, ...log } : l)
      })),
      deleteFoodLog: (id) => set((state) => ({
        foodLogs: state.foodLogs.filter((l) => l.id !== id)
      })),
      getTodayFoodLogs: () => {
        const today = new Date().toISOString().split('T')[0];
        return get().foodLogs.filter((l) => l.date === today);
      },
      getTodayNutrition: () => {
        const today = new Date().toISOString().split('T')[0];
        const logs = get().foodLogs.filter((l) => l.date === today);
        return logs.reduce<NutritionFacts>((acc, log) => ({
          calories: acc.calories + (log.total?.calories || 0),
          protein: (acc.protein || 0) + (log.total?.protein || 0),
          carbs: (acc.carbs || 0) + (log.total?.carbs || 0),
          fat: (acc.fat || 0) + (log.total?.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
      },
      getFoodLogsByDate: (date) => get().foodLogs.filter((l) => l.date === date),
      getNutritionStats: (days) => {
        // 只统计最近 days 天内“有记录”的日期，按实际记录天数求平均，避免把没记录的天当 0
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days - 1));
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const byDate = new Map<string, DailyNutrition>();
        get().foodLogs.forEach((log) => {
          if (log.date < cutoffStr) return;
          const cur = byDate.get(log.date) || {
            date: log.date, calories: 0, protein: 0, carbs: 0, fat: 0,
          };
          cur.calories += log.total?.calories || 0;
          cur.protein += log.total?.protein || 0;
          cur.carbs += log.total?.carbs || 0;
          cur.fat += log.total?.fat || 0;
          byDate.set(log.date, cur);
        });

        const daily = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
        const n = daily.length;
        const sum = daily.reduce(
          (acc, d) => ({
            calories: acc.calories + d.calories,
            protein: acc.protein + d.protein,
            carbs: acc.carbs + d.carbs,
            fat: acc.fat + d.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        const r1 = (v: number) => Math.round(v * 10) / 10;

        return {
          days: n,
          avgCalories: n > 0 ? Math.round(sum.calories / n) : 0,
          avgProtein: n > 0 ? r1(sum.protein / n) : 0,
          avgCarbs: n > 0 ? r1(sum.carbs / n) : 0,
          avgFat: n > 0 ? r1(sum.fat / n) : 0,
          daily,
        };
      },

      // ── 身体测量时序 + 预测校准 ──
      bodyMeasurements: [],
      predictionSnapshots: [],
      calibration: null,
      addBodyMeasurement: (m) => set((state) => {
        // 同一天只保留一条（重复记录则覆盖）
        const rest = state.bodyMeasurements.filter((x) => x.date !== m.date);
        const next = [...rest, m];
        const newestDate = next.reduce((max, x) => (x.date > max ? x.date : max), '');

        // 若新增的是最新一条，同步更新 userProfile 的体重/体脂
        const userProfile = state.userProfile && m.date >= newestDate
          ? {
              ...state.userProfile,
              weight: m.weight,
              bodyFat: m.bodyFat !== undefined ? m.bodyFat : state.userProfile.bodyFat,
              updatedAt: Date.now(),
            }
          : state.userProfile;

        return { bodyMeasurements: next, userProfile };
      }),
      deleteBodyMeasurement: (id) => set((state) => ({
        bodyMeasurements: state.bodyMeasurements.filter((x) => x.id !== id),
      })),
      getLatestMeasurement: () => {
        const list = get().bodyMeasurements;
        if (list.length === 0) return undefined;
        return list.reduce((a, b) => (a.date >= b.date ? a : b));
      },
      addPredictionSnapshot: (s) => set((state) => {
        // 同一天只保留一条，最多保留最近 60 条
        const rest = state.predictionSnapshots.filter((x) => x.date !== s.date);
        const next = [...rest, s].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 60);
        return { predictionSnapshots: next };
      }),
      setCalibration: (c) => set({ calibration: c }),

      // 云同步状态（不持久化）
      syncStatus: 'idle',
      setSyncStatus: (status) => set({ syncStatus: status }),

      // 登录态（不持久化）
      authUser: null,
      setAuthUser: (user) => set({ authUser: user }),

      // 游客模式（不持久化）
      isGuest: false,
      setIsGuest: (isGuest) => set({ isGuest })
    }),
    {
      name: 'fitness-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // 仅持久化业务数据，syncStatus 等运行时状态不持久化
      partialize: (state) => ({
        userProfile: state.userProfile,
        exercises: state.exercises,
        workoutPlans: state.workoutPlans,
        workoutRecords: state.workoutRecords,
        dailyActivities: state.dailyActivities,
        foodLogs: state.foodLogs,
        bodyMeasurements: state.bodyMeasurements,
        predictionSnapshots: state.predictionSnapshots,
        calibration: state.calibration,
      })
    }
  )
);
