import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Vibration } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Dialog, ProgressBar } from 'react-native-paper';
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
    
    // 更新输入框默认值
    if (currentPlanExercise) {
      setWeight(currentPlanExercise.weight?.toString() || '');
      setReps(currentPlanExercise.reps.toString());
    }
    
    // 开始计时
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
          // 计时结束
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

    // 启动休息计时器
    startRestTimer(currentPlanExercise?.restTime || 90);
  };

  const handleNextExercise = () => {
    if (plan && currentExerciseIndex < plan.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      // 训练完成
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
        <Text style={styles.noPlanText}>请从计划开始训练</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部信息栏 */}
      <View style={styles.header}>
        <Text style={styles.timer}>⏱ {formatTime(elapsedTime)}</Text>
        <Button mode="outlined" textColor="#ff6b35" onPress={handleCancel}>
          结束训练
        </Button>
      </View>

      <ScrollView style={styles.content}>
        {/* 当前动作卡片 */}
        <Card style={styles.exerciseCard}>
          <Card.Content>
            <Text style={styles.progress}>动作 {currentExerciseIndex + 1} / {plan.exercises.length}</Text>
            <Text style={styles.exerciseName}>{currentExercise?.name}</Text>
            <Text style={styles.targetInfo}>
              目标: {currentPlanExercise?.sets}组 × {currentPlanExercise?.reps}次
            </Text>
            <Text style={styles.restInfo}>
              休息: {currentPlanExercise?.restTime}秒
            </Text>
          </Card.Content>
        </Card>

        {/* 已完成组数 */}
        <Card style={styles.setsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>已完成组数</Text>
            {completedSets.length === 0 ? (
              <Text style={styles.noSets}>暂无完成记录</Text>
            ) : (
              completedSets.map((set, index) => (
                <View key={index} style={styles.setRow}>
                  <Text style={styles.setNumber}>第{set.setNumber}组</Text>
                  <Text style={styles.setDetail}>{set.weight}kg × {set.reps}次</Text>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* 记录新组 */}
        <Card style={styles.inputCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>记录新组</Text>
            <View style={styles.inputRow}>
              <TextInput
                label="重量(kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="次数"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <Button 
              mode="contained" 
              onPress={handleCompleteSet}
              disabled={!weight || !reps}
              style={styles.completeButton}
            >
              完成本组并开始休息
            </Button>
          </Card.Content>
        </Card>

        {/* 导航按钮 */}
        <View style={styles.navigationButtons}>
          <Button 
            mode="outlined" 
            onPress={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            style={styles.navButton}
          >
            上一动作
          </Button>
          <Button 
            mode="contained" 
            onPress={handleNextExercise}
            style={styles.navButton}
          >
            {currentExerciseIndex === plan.exercises.length - 1 ? '完成训练' : '下一动作'}
          </Button>
        </View>
      </ScrollView>

      {/* 休息计时器弹窗 */}
      <Portal>
        <Dialog visible={showRestTimer} dismissable={false} style={styles.restDialog}>
          <Dialog.Content style={styles.restContent}>
            <Text style={styles.restTitle}>⏱ 组间休息</Text>
            <Text style={styles.restTimer}>{formatTime(restTimeRemaining)}</Text>
            <ProgressBar 
              progress={totalRestTime > 0 ? (totalRestTime - restTimeRemaining) / totalRestTime : 0} 
              color="#1A5F7A"
              style={styles.progressBar}
            />
            <Text style={styles.restInfo}>
              {currentExercise?.name} 第{completedSets.length}组已完成
            </Text>
            <View style={styles.restButtons}>
              <Button mode="outlined" onPress={() => addTime(10)}>+10秒</Button>
              <Button mode="outlined" onPress={() => addTime(30)}>+30秒</Button>
              <Button mode="contained" onPress={skipRest}>跳过休息</Button>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  exerciseCard: {
    marginBottom: 10,
    backgroundColor: '#1A5F7A',
  },
  progress: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  targetInfo: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  restInfo: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  setsCard: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noSets: {
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  setNumber: {
    fontSize: 16,
    width: 80,
  },
  setDetail: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  checkmark: {
    fontSize: 20,
    color: '#28A745',
    width: 30,
    textAlign: 'right',
  },
  inputCard: {
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#fff',
  },
  completeButton: {
    marginTop: 10,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  restDialog: {
    backgroundColor: '#1A5F7A',
  },
  restContent: {
    alignItems: 'center',
    padding: 20,
  },
  restTitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
  },
  restTimer: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    marginBottom: 20,
  },
  restButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  noPlanText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
});
