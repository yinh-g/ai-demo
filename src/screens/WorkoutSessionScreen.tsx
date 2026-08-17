import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Vibration, Pressable, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Dialog, ProgressBar, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { ExerciseRecord, SetRecord, PlanExercise } from '../types';
import ExercisePickerDialog from '../components/ExercisePickerDialog';

export default function WorkoutSessionScreen({ navigation, route }: any) {
  const { planId } = route.params || {};
  const { workoutPlans, exercises, currentWorkout, startWorkout, endWorkout, cancelWorkout, updateCurrentWorkout } = useAppStore();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const startTimeRef = useRef<number>(currentWorkout?.startTime || Date.now());
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 训练中可临时调整动作列表：sessionExercises 从计划复制，运行期可增/换，不回写计划
  const [sessionExercises, setSessionExercises] = useState<PlanExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'replace'>('add');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // 优先使用用户选择的计划，其次路由参数，最后回退到进行中训练的计划
  const effectivePlanId = selectedPlanId || planId || currentWorkout?.planId;
  const plan = effectivePlanId ? workoutPlans.find(p => p.id === effectivePlanId) : null;

  // 初始化 sessionExercises：优先从计划加载，计划不存在时从 currentWorkout 已记录的动作恢复
  useEffect(() => {
    if (sessionExercises.length > 0) return;
    if (plan) {
      setSessionExercises(plan.exercises);
    } else if (currentWorkout && currentWorkout.exercises.length > 0) {
      // 计划被删除但训练进行中：从已记录的动作恢复可编辑列表
      const recovered: PlanExercise[] = currentWorkout.exercises.map((er, idx) => ({
        exerciseId: er.exerciseId,
        sets: 3,
        reps: 10,
        weight: 0,
        restTime: 90,
        order: idx,
      }));
      setSessionExercises(recovered);
    }
  }, [plan, currentWorkout]);

  const currentPlanExercise = sessionExercises[currentExerciseIndex];
  const currentExercise = currentPlanExercise ? exercises.find(e => e.id === currentPlanExercise.exerciseId) : null;

  useEffect(() => {
    if (effectivePlanId && !currentWorkout) {
      startWorkout(effectivePlanId);
    }

    if (currentPlanExercise) {
      setWeight(currentPlanExercise.weight?.toString() || '');
      setReps(currentPlanExercise.reps.toString());
    }

    // 使用 Date.now() 计算，支持后台运行
    elapsedTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
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

    const startTime = Date.now();
    const endTime = startTime + seconds * 1000;

    restTimerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        Vibration.vibrate([0, 500, 200, 500]);
        if (restTimerRef.current) clearInterval(restTimerRef.current);
        setShowRestTimer(false);
        setRestTimeRemaining(0);
      } else {
        setRestTimeRemaining(remaining);
      }
    }, 1000);
  };

  const skipRest = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setShowRestTimer(false);
    setRestTimeRemaining(0);
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

    updateCurrentWorkout({
      exercises: updatedExercises,
      totalVolume
    });

    startRestTimer(currentPlanExercise?.restTime || 90);
  };

  const handleNextExercise = () => {
    if (plan && currentExerciseIndex < sessionExercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  // 完成训练：保存记录并返回
  const handleFinish = () => {
    endWorkout();
    navigation.goBack();
  };

  // 放弃训练：标记为取消并返回
  const handleAbort = () => {
    cancelWorkout();
    navigation.goBack();
  };

  // 返回训练页（保持训练进行中）
  const handleBack = () => {
    navigation.navigate('Main', { screen: 'Training' });
  };

  // 临时添加动作到当前训练（不修改原计划）
  const handleAddExercise = () => {
    setPickerMode('add');
    setPickerVisible(true);
  };

  // 替换当前动作（仅当本动作尚无完成组时允许，避免丢失已记录数据）
  const handleReplaceExercise = () => {
    const hasCompletedSets = currentWorkout?.exercises.some(
      (e) => e.exerciseId === currentExercise?.id && (e.sets?.length || 0) > 0
    );
    if (hasCompletedSets) {
      return;
    }
    setPickerMode('replace');
    setPickerVisible(true);
  };

  const onPickExercise = (picked: any) => {
    if (pickerMode === 'replace') {
      // 替换当前条目的 exerciseId，保留计划设定的组数/次数/休息
      setSessionExercises((prev) =>
        prev.map((pe, idx) =>
          idx === currentExerciseIndex ? { ...pe, exerciseId: picked.id } : pe
        )
      );
      // 同步移除 currentWorkout 中可能存在的空记录（无 sets 的占位）
      if (currentWorkout) {
        const cleaned = currentWorkout.exercises.filter(
          (e) => e.exerciseId !== currentExercise?.id || (e.sets?.length || 0) > 0
        );
        if (cleaned.length !== currentWorkout.exercises.length) {
          updateCurrentWorkout({ exercises: cleaned });
        }
      }
    } else {
      // 追加新动作到末尾
      const newPlanExercise: PlanExercise = {
        exerciseId: picked.id,
        sets: 3,
        reps: 10,
        weight: 0,
        restTime: 90,
        order: sessionExercises.length,
      };
      setSessionExercises((prev) => [...prev, newPlanExercise]);
    }
    setPickerVisible(false);
  };

  const currentExerciseRecord = currentWorkout?.exercises.find(e => e.exerciseId === currentExercise?.id);
  const completedSets = currentExerciseRecord?.sets || [];

  // 仅在没有进行中训练且没有计划时显示空状态
  if (!plan && !currentWorkout) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.illustrationWrapper}>
            <Text style={styles.illustrationEmoji}>💪</Text>
          </View>
          <Text style={styles.emptyTitle}>开始力量训练</Text>
          <Text style={styles.emptySubtitle}>选择一个训练计划开始记录，或创建一个新计划</Text>
          
          {workoutPlans.length > 0 && (
            <View style={styles.planListCard}>
              <Text style={styles.planListTitle}>📋 你的训练计划</Text>
              {workoutPlans.slice(0, 3).map((p: any) => (
                <Pressable
                  key={p.id}
                  style={styles.planItem}
                  onPress={() => setSelectedPlanId(p.id)}
                >
                  <View style={styles.planItemLeft}>
                    <View style={styles.planItemIconBg}>
                      <Text style={styles.planItemIcon}>🔥</Text>
                    </View>
                    <View style={styles.planItemInfo}>
                      <Text style={styles.planItemName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.planItemMeta}>{p.exercises.length}个动作</Text>
                    </View>
                  </View>
                  <Text style={styles.planItemArrow}>›</Text>
                </Pressable>
              ))}
              {workoutPlans.length > 3 && (
                <Text style={styles.morePlansHint}>还有 {workoutPlans.length - 3} 个计划...</Text>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreatePlan')}
              style={styles.primaryActionBtn}
              labelStyle={styles.primaryActionLabel}
              icon="plus-circle"
            >
              {workoutPlans.length === 0 ? '创建训练计划' : '创建新计划'}
            </Button>
            
            {workoutPlans.length > 0 && (
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Main', { screen: 'Plans' })}
                style={styles.secondaryActionBtn}
                labelStyle={styles.secondaryActionLabel}
                icon="view-grid"
              >
                管理所有计划
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Avatar.Icon size={28} icon="arrow-left" style={styles.backIcon} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.timerContainer}>
            <Avatar.Icon size={28} icon="timer" style={styles.timerIcon} color="#6366F1" />
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleAbort} style={styles.abortHeaderBtn}>
            <Text style={styles.abortHeaderBtnText}>放弃</Text>
          </TouchableOpacity>
          <Button mode="contained" onPress={handleFinish} style={styles.endButton} labelStyle={{ fontSize: 13 }}>
            完成
          </Button>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.exerciseCard}>
          <Card.Content>
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>{currentExerciseIndex + 1} / {sessionExercises.length}</Text>
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

        <View style={styles.adjustButtons}>
          <Button
            mode="outlined"
            onPress={handleAddExercise}
            style={styles.adjustButton}
            labelStyle={styles.adjustButtonLabel}
            icon="plus"
            textColor="#6366F1"
          >
            添加动作
          </Button>
          <Button
            mode="outlined"
            onPress={handleReplaceExercise}
            disabled={completedSets.length > 0}
            style={styles.adjustButton}
            labelStyle={styles.adjustButtonLabel}
            icon="swap-horizontal"
            textColor="#F59E0B"
          >
            {completedSets.length > 0 ? '已记录不可替换' : '替换动作'}
          </Button>
        </View>

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
            icon={currentExerciseIndex === sessionExercises.length - 1 ? 'flag-checkered' : 'arrow-right'}
          >
            {currentExerciseIndex === sessionExercises.length - 1 ? '完成训练' : '下一动作'}
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
          </Dialog.Content>
          <Dialog.Actions style={styles.restActions}>
            <Button mode="outlined" onPress={() => addTime(10)} style={styles.restActionButton} labelStyle={{ color: '#fff', fontSize: 12 }}>
              +10秒
            </Button>
            <Button mode="outlined" onPress={() => addTime(30)} style={styles.restActionButton} labelStyle={{ color: '#fff', fontSize: 12 }}>
              +30秒
            </Button>
            <Button mode="contained" onPress={skipRest} style={[styles.restActionButton, styles.skipActionButton]} labelStyle={{ color: '#6366F1', fontSize: 12 }}>
              跳过休息
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ExercisePickerDialog
        visible={pickerVisible}
        exercises={exercises}
        title={pickerMode === 'replace' ? '替换当前动作' : '添加动作'}
        onPick={onPickExercise}
        onClose={() => setPickerVisible(false)}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    backgroundColor: '#F1F5F9',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  abortHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  abortHeaderBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
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
    backgroundColor: '#10B981',
    paddingVertical: 2,
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
  adjustButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  adjustButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  adjustButtonLabel: {
    fontSize: 14,
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
  restActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  restActionButton: {
    flex: 1,
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  skipActionButton: {
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  illustrationWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  illustrationEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  planListCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  planListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  planItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planItemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planItemIcon: {
    fontSize: 20,
  },
  planItemInfo: {
    flex: 1,
  },
  planItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  planItemMeta: {
    fontSize: 13,
    color: '#94A3B8',
  },
  planItemArrow: {
    fontSize: 24,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  morePlansHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButtons: {
    gap: 12,
  },
  primaryActionBtn: {
    borderRadius: 14,
    backgroundColor: '#6366F1',
    paddingVertical: 4,
  },
  primaryActionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    borderRadius: 14,
    borderColor: '#6366F1',
    paddingVertical: 4,
  },
  secondaryActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
});
