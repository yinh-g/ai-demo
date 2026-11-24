import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, WorkoutPlan, WorkoutRecord, UserProfile, CardioActivity, WorkoutType, DailyActivity, FoodLog, NutritionFacts, BodyMeasurement, PredictionSnapshot, CalibrationState, BodyFatSample, BodyFatCalibration } from '../types';
import { fuseBodyFat } from '../utils/bodyFatFusion';
import { estimateBodyFatFromWaist } from '../utils/bodyFatEstimators';

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

// ── 多源体脂样本工具 ──
const MAX_BODY_FAT_SAMPLES = 500;

// 由身体测量自动派生的样本 id 前缀：便于同日覆盖、随测量一起删除
const derivedPrefix = (date: string) => `bfm-${date}-`;

function sortSamples(list: BodyFatSample[]): BodyFatSample[] {
  return [...list].sort((a, b) => {
    if (a.date === b.date) return b.createdAt - a.createdAt;
    return a.date < b.date ? 1 : -1;
  });
}

function dedupeSamples(list: BodyFatSample[]): BodyFatSample[] {
  const byId = new Map<string, BodyFatSample>();
  list.forEach((s) => {
    const cur = byId.get(s.id);
    if (!cur || s.createdAt >= cur.createdAt) byId.set(s.id, s);
  });
  return sortSamples(Array.from(byId.values())).slice(0, MAX_BODY_FAT_SAMPLES);
}

// 从一条身体测量派生体脂样本：手动/体脂秤值 + 腰围推算
function deriveSamplesFromMeasurement(
  m: BodyMeasurement,
  profile: UserProfile | null
): BodyFatSample[] {
  const out: BodyFatSample[] = [];
  if (m.bodyFat !== undefined && Number.isFinite(m.bodyFat)) {
    const source = m.bodyFatSource ?? 'scale';
    out.push({
      id: `${derivedPrefix(m.date)}${source}`,
      date: m.date,
      value: m.bodyFat,
      source,
      createdAt: m.createdAt,
    });
  }
  if (m.waist !== undefined && profile) {
    const est = estimateBodyFatFromWaist({
      waistCm: m.waist,
      heightCm: profile.height,
      gender: profile.gender,
      age: profile.age,
    });
    if (est !== null) {
      out.push({
        id: `${derivedPrefix(m.date)}waist`,
        date: m.date,
        value: est,
        source: 'waist',
        createdAt: m.createdAt,
        note: `腰围 ${m.waist}cm 推算`,
      });
    }
  }
  return out;
}

// 融合结果回写 userProfile.bodyFat，让预测自动用上更可信的体脂
function withFusedBodyFat(
  profile: UserProfile | null,
  samples: BodyFatSample[],
  cal: BodyFatCalibration | null
): UserProfile | null {
  if (!profile) return profile;
  const fused = fuseBodyFat({ samples, calibration: cal });
  if (!fused) return profile;
  if (profile.bodyFat !== undefined && Math.abs(profile.bodyFat - fused.value) < 0.05) {
    return profile;
  }
  return { ...profile, bodyFat: fused.value, updatedAt: Date.now() };
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

  // 多源体脂（体脂秤/手动/InBody/腰围/拍照）
  bodyFatSamples: BodyFatSample[];
  bodyFatCalibration: BodyFatCalibration | null;
  addBodyFatSample: (s: BodyFatSample) => void;
  addBodyFatSamples: (list: BodyFatSample[]) => void;
  deleteBodyFatSample: (id: string) => void;
  setBodyFatCalibration: (c: BodyFatCalibration | null) => void;
  // 老数据迁移：把历史身体测量里的体脂/腰围补成多源样本（幂等）
  backfillBodyFatSamples: () => void;

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
      bodyFatSamples: [],
      bodyFatCalibration: null,
      addBodyMeasurement: (m) => set((state) => {
        // 同一天只保留一条（重复记录则覆盖）
        const rest = state.bodyMeasurements.filter((x) => x.date !== m.date);
        const next = [...rest, m];
        const newestDate = next.reduce((max, x) => (x.date > max ? x.date : max), '');

        // 同步派生多源体脂样本（同日期覆盖）
        const prefix = derivedPrefix(m.date);
        const kept = state.bodyFatSamples.filter((s) => !s.id.startsWith(prefix));
        const bodyFatSamples = dedupeSamples([
          ...deriveSamplesFromMeasurement(m, state.userProfile),
          ...kept,
        ]);

        // 若新增的是最新一条，同步更新 userProfile 的体重/体脂
        const baseProfile = state.userProfile && m.date >= newestDate
          ? {
              ...state.userProfile,
              weight: m.weight,
              bodyFat: m.bodyFat !== undefined ? m.bodyFat : state.userProfile.bodyFat,
              updatedAt: Date.now(),
            }
          : state.userProfile;

        return {
          bodyMeasurements: next,
          bodyFatSamples,
          userProfile: withFusedBodyFat(baseProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),
      deleteBodyMeasurement: (id) => set((state) => {
        const target = state.bodyMeasurements.find((x) => x.id === id);
        const prefix = target ? derivedPrefix(target.date) : null;
        const bodyFatSamples = prefix
          ? state.bodyFatSamples.filter((s) => !s.id.startsWith(prefix))
          : state.bodyFatSamples;
        return {
          bodyMeasurements: state.bodyMeasurements.filter((x) => x.id !== id),
          bodyFatSamples,
          userProfile: withFusedBodyFat(state.userProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),
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

      // ── 多源体脂 ──
      addBodyFatSample: (s) => set((state) => {
        const bodyFatSamples = dedupeSamples([
          s,
          ...state.bodyFatSamples.filter((x) => x.id !== s.id),
        ]);
        return {
          bodyFatSamples,
          userProfile: withFusedBodyFat(state.userProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),
      addBodyFatSamples: (list) => set((state) => {
        if (list.length === 0) return {};
        const bodyFatSamples = dedupeSamples([...list, ...state.bodyFatSamples]);
        return {
          bodyFatSamples,
          userProfile: withFusedBodyFat(state.userProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),
      deleteBodyFatSample: (id) => set((state) => {
        const bodyFatSamples = state.bodyFatSamples.filter((x) => x.id !== id);
        return {
          bodyFatSamples,
          userProfile: withFusedBodyFat(state.userProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),
      setBodyFatCalibration: (c) => set((state) => ({
        bodyFatCalibration: c,
        userProfile: withFusedBodyFat(state.userProfile, state.bodyFatSamples, c),
      })),
      backfillBodyFatSamples: () => set((state) => {
        const existing = new Set(state.bodyFatSamples.map((s) => s.id));
        const missing = state.bodyMeasurements
          .flatMap((m) => deriveSamplesFromMeasurement(m, state.userProfile))
          .filter((s) => !existing.has(s.id));
        if (missing.length === 0) return {};
        const bodyFatSamples = dedupeSamples([...missing, ...state.bodyFatSamples]);
        return {
          bodyFatSamples,
          userProfile: withFusedBodyFat(state.userProfile, bodyFatSamples, state.bodyFatCalibration),
        };
      }),

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
        bodyFatSamples: state.bodyFatSamples,
        bodyFatCalibration: state.bodyFatCalibration,
      })
    }
  )
);
