import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Vibration } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Dialog, ProgressBar, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { ExerciseRecord, SetRecord } from '../types';

export default function WorkoutSessionScreen({ navigation, route }: any) {
  const { planId } = route.params || {};
  const { workoutPlans, exercises, currentWorkout, startWorkout, endWorkout, cancelWorkout, updateWorkoutRecord } = useAppStore();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const plan = planId ? workoutPlans.find(p => p.id === planId) : null;
  const currentPlanExercise = plan?.exercises[currentExerciseIndex];
  const currentExercise = currentPlanExercise ? exercises.find(e => e.id === currentPlanExercise.exerciseId) : null;

  useEffect(() => {
    if (planId && !currentWorkout) {
      startWorkout(planId);
    }

    if (currentPlanExercise) {
      setWeight(currentPlanExercise.weight?.toString() || '');
      setReps(currentPlanExercise.reps.toString());
    }

    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [currentExerciseIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRestTimer = (seconds: number) => {
    setRestTimeRemaining(seconds);
    setTotalRestTime(seconds);
    setShowRestTimer(true);

    if (restTimerRef.current) clearInterval(restTimerRef.current);

    restTimerRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          Vibration.vibrate([0, 500, 200, 500]);
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          setShowRestTimer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setShowRestTimer(false);
  };

  const addTime = (seconds: number) => {
    setRestTimeRemaining(prev => prev + seconds);
    setTotalRestTime(prev => prev + seconds);
  };

  const handleCompleteSet = () => {
    if (!currentWorkout || !currentExercise) return;

    const weightNum = parseFloat(weight) || 0;
    const repsNum = parseInt(reps) || 0;

    if (weightNum <= 0 || repsNum <= 0) return;

    const newSet: SetRecord = {
      setNumber: (currentWorkout.exercises.find(e => e.exerciseId === currentExercise.id)?.sets.length || 0) + 1,
      weight: weightNum,
      reps: repsNum,
      isCompleted: true,
      restTime: currentPlanExercise?.restTime || 90
    };

    const existingExerciseIndex = currentWorkout.exercises.findIndex(e => e.exerciseId === currentExercise.id);
    let updatedExercises: ExerciseRecord[];

    if (existingExerciseIndex >= 0) {
      updatedExercises = [...currentWorkout.exercises];
      updatedExercises[existingExerciseIndex].sets.push(newSet);
    } else {
      updatedExercises = [...currentWorkout.exercises, {
        exerciseId: currentExercise.id,
        sets: [newSet]
      }];
    }

    const totalVolume = updatedExercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
    );

    updateWorkoutRecord(currentWorkout.id, {
      exercises: updatedExercises,
      totalVolume
    });

    startRestTimer(currentPlanExercise?.restTime || 90);
  };

  const handleNextExercise = () => {
    if (plan && currentExerciseIndex < plan.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      endWorkout();
      navigation.goBack();
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleCancel = () => {
    cancelWorkout();
    navigation.goBack();
  };

  const currentExerciseRecord = currentWorkout?.exercises.find(e => e.exerciseId === currentExercise?.id);
  const completedSets = currentExerciseRecord?.sets || [];

  if (!plan) {
    return (
      <View style={styles.container}>
        <Avatar.Icon size={80} icon="alert-circle" style={styles.emptyIcon} color="#CBD5E1" />
        <Text style={styles.noPlanText}>请从计划开始训练</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton} labelStyle={styles.backButtonLabel}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.timerContainer}>
          <Avatar.Icon size={28} icon="timer" style={styles.timerIcon} color="#6366F1" />
          <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
        </View>
        <Button mode="outlined" textColor="#EF4444" onPress={handleCancel} style={styles.endButton} labelStyle={{ fontSize: 13 }}>
          结束训练
        </Button>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.exerciseCard}>
          <Card.Content>
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>{currentExerciseIndex + 1} / {plan.exercises.length}</Text>
              </View>
              <Avatar.Icon size={36} icon="dumbbell" style={styles.exerciseIcon} color="#fff" />
            </View>
            <Text style={styles.exerciseName}>{currentExercise?.name}</Text>
            <View style={styles.targetRow}>
              <View style={styles.targetItem}>
                <Avatar.Icon size={16} icon="repeat" style={{ backgroundColor: 'transparent' }} color="rgba(255,255,255,0.7)" />
                <Text style={styles.targetInfo}>{currentPlanExercise?.sets}组 × {currentPlanExercise?.reps}次</Text>
              </View>
              <View style={styles.targetItem}>
                <Avatar.Icon size={16} icon="sleep" style={{ backgroundColor: 'transparent' }} color="rgba(255,255,255,0.7)" />
                <Text style={styles.targetInfo}>休息 {currentPlanExercise?.restTime}秒</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.setsCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={20} icon="check-circle" style={styles.sectionIcon} color="#10B981" />
              <Text style={styles.sectionTitle}>已完成组数</Text>
            </View>
            {completedSets.length === 0 ? (
              <View style={styles.noSetsContainer}>
                <Text style={styles.noSets}>暂无完成记录</Text>
              </View>
            ) : (
              completedSets.map((set, index) => (
                <View key={index} style={styles.setRow}>
                  <View style={styles.setLeft}>
                    <View style={styles.setNumberBadge}>
                      <Text style={styles.setNumber}>{set.setNumber}</Text>
                    </View>
                    <Text style={styles.setDetail}>{set.weight}kg × {set.reps}次</Text>
                  </View>
                  <Avatar.Icon size={20} icon="check" style={{ backgroundColor: 'transparent' }} color="#10B981" />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.inputCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={20} icon="pencil" style={styles.sectionIcon} color="#6366F1" />
              <Text style={styles.sectionTitle}>记录新组</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                label="重量(kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
                left={<TextInput.Icon icon="weight-kilogram" color="#94A3B8" />}
              />
              <TextInput
                label="次数"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
                left={<TextInput.Icon icon="repeat" color="#94A3B8" />}
              />
            </View>
            <Button
              mode="contained"
              onPress={handleCompleteSet}
              disabled={!weight || !reps}
              style={styles.completeButton}
              labelStyle={styles.completeButtonLabel}
              icon="check"
            >
              完成本组并开始休息
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.navigationButtons}>
          <Button
            mode="outlined"
            onPress={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            style={styles.navButton}
            labelStyle={styles.navButtonLabel}
            textColor="#64748B"
          >
            上一动作
          </Button>
          <Button
            mode="contained"
            onPress={handleNextExercise}
            style={[styles.navButton, styles.navButtonPrimary]}
            labelStyle={styles.navButtonLabel}
            icon={currentExerciseIndex === plan.exercises.length - 1 ? 'flag-checkered' : 'arrow-right'}
          >
            {currentExerciseIndex === plan.exercises.length - 1 ? '完成训练' : '下一动作'}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={showRestTimer} dismissable={false} style={styles.restDialog}>
          <Dialog.Content style={styles.restContent}>
            <Avatar.Icon size={64} icon="timer" style={styles.restIcon} color="#fff" />
            <Text style={styles.restTitle}>组间休息</Text>
            <Text style={styles.restTimer}>{formatTime(restTimeRemaining)}</Text>
            <ProgressBar
              progress={totalRestTime > 0 ? (totalRestTime - restTimeRemaining) / totalRestTime : 0}
              color="#fff"
              style={styles.progressBar}
            />
            <Text style={styles.restExerciseInfo}>
              {currentExercise?.name} 第{completedSets.length}组已完成
            </Text>
            <View style={styles.restButtons}>
              <Button mode="outlined" onPress={() => addTime(10)} style={styles.restButton} labelStyle={{ color: '#fff', fontSize: 13 }}>
                +10秒
              </Button>
              <Button mode="outlined" onPress={() => addTime(30)} style={styles.restButton} labelStyle={{ color: '#fff', fontSize: 13 }}>
                +30秒
              </Button>
              <Button mode="contained" onPress={skipRest} style={[styles.restButton, styles.skipButton]} labelStyle={{ fontSize: 13 }}>
                跳过休息
              </Button>
            </View>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 8,
  },
  timer: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  endButton: {
    borderRadius: 10,
    borderColor: '#EF4444',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exerciseCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 16,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetInfo: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginLeft: 4,
  },
  setsCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  noSetsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noSets: {
    color: '#94A3B8',
    fontSize: 14,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  setLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  setDetail: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  inputCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
  },
  completeButton: {
    borderRadius: 12,
    backgroundColor: '#10B981',
    paddingVertical: 4,
  },
  completeButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  navButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  navButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  restDialog: {
    backgroundColor: '#6366F1',
    borderRadius: 24,
  },
  restContent: {
    alignItems: 'center',
    padding: 24,
  },
  restIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  restTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 16,
  },
  restTimer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    marginBottom: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  restExerciseInfo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  restButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  restButton: {
    flex: 1,
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  skipButton: {
    backgroundColor: '#fff',
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  noPlanText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#64748B',
  },
  backButton: {
    borderRadius: 12,
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
  },
  backButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
