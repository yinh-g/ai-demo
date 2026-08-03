import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, WorkoutPlan, WorkoutRecord, UserProfile, CardioActivity, WorkoutType } from '../types';

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

  // 当前训练（力量）
  currentWorkout: WorkoutRecord | null;
  startWorkout: (planId: string) => void;
  endWorkout: () => void;
  cancelWorkout: () => void;

  // 当前有氧训练
  currentCardio: WorkoutRecord | null;
  startCardio: (activity: CardioActivity) => void;
  pauseCardio: () => void;
  resumeCardio: () => void;
  endCardio: (data: { duration: number; distance?: number; calories?: number }) => void;
  cancelCardio: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 用户资料
      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),

      // 动作库
      exercises: [],
      addExercise: (exercise) => set((state) => ({
        exercises: [...state.exercises, exercise]
      })),
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
      }
    }),
    {
      name: 'fitness-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
