import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Avatar, TextInput, Portal, Dialog, Divider, IconButton } from 'react-native-paper';
import { useAppStore } from '../store';
import { WorkoutRecord, SetRecord } from '../types';

export default function WorkoutRecordDetailScreen({ navigation, route }: any) {
  const { recordId } = route.params || {};
  const { workoutRecords, exercises, workoutPlans, deleteWorkoutRecord, updateWorkoutRecord } = useAppStore();

  const record = workoutRecords.find(r => r.id === recordId);
  const plan = record?.planId ? workoutPlans.find(p => p.id === record.planId) : null;

  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<{ exerciseIndex: number; setIndex: number; set: SetRecord } | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  if (!record) {
    return (
      <View style={styles.container}>
        <Avatar.Icon size={80} icon="alert-circle" style={styles.emptyIcon} color="#CBD5E1" />
        <Text style={styles.noRecordText}>记录不存在</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton} labelStyle={styles.backButtonLabel}>
          返回
        </Button>
      </View>
    );
  }

  const getActivityLabel = (type?: string) => {
    const labels: Record<string, string> = {
      running: '跑步',
      cycling: '骑行',
      incline_walk: '爬坡',
      rowing: '划船'
    };
    return labels[type || ''] || type || '有氧';
  };

  const getActivityIcon = (type?: string) => {
    const icons: Record<string, string> = {
      running: 'run',
      cycling: 'bike',
      incline_walk: 'walk',
      rowing: 'rowing'
    };
    return icons[type || ''] || 'heart-pulse';
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '确定要删除这条训练记录吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteWorkoutRecord(record.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const openEditDialog = (exerciseIndex: number, setIndex: number, set: SetRecord) => {
    setEditingSet({ exerciseIndex, setIndex, set });
    setEditWeight(set.weight.toString());
    setEditReps(set.reps.toString());
    setEditDialogVisible(true);
  };

  const saveEdit = () => {
    if (!editingSet || !editWeight || !editReps) return;

    const weightNum = parseFloat(editWeight);
    const repsNum = parseInt(editReps);
    if (weightNum <= 0 || repsNum <= 0) return;

    const updatedExercises = [...record.exercises];
    const exerciseRecord = { ...updatedExercises[editingSet.exerciseIndex] };
    const updatedSets = [...(exerciseRecord.sets || [])];
    updatedSets[editingSet.setIndex] = {
      ...updatedSets[editingSet.setIndex],
      weight: weightNum,
      reps: repsNum
    };
    exerciseRecord.sets = updatedSets;
    updatedExercises[editingSet.exerciseIndex] = exerciseRecord;

    const totalVolume = updatedExercises.reduce((sum, ex) =>
      sum + (ex.sets || []).reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
    );

    updateWorkoutRecord(record.id, {
      exercises: updatedExercises,
      totalVolume
    });

    setEditDialogVisible(false);
    setEditingSet(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {record.workoutType === 'strength' ? '力量训练' : getActivityLabel(record.activityType)}
          </Text>
          <Text style={styles.headerDate}>{formatDate(record.date)}</Text>
        </View>
        <Avatar.Icon
          size={48}
          icon={record.workoutType === 'strength' ? 'dumbbell' : getActivityIcon(record.activityType)}
          style={styles.headerIcon}
          color="#6366F1"
        />
      </View>

      <Card style={styles.overviewCard}>
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{record.duration}</Text>
              <Text style={styles.statLabel}>分钟</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(record.totalVolume || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>容量(kg)</Text>
            </View>
            {record.totalDistance !== undefined && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{record.totalDistance.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>距离(km)</Text>
                </View>
              </>
            )}
            {record.totalCalories !== undefined && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{record.totalCalories}</Text>
                  <Text style={styles.statLabel}>消耗(kcal)</Text>
                </View>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {plan && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={20} icon="notebook" style={styles.sectionIcon} color="#6366F1" />
              <Text style={styles.sectionTitle}>训练计划</Text>
            </View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDetail}>{plan.exercises.length} 个动作</Text>
          </Card.Content>
        </Card>
      )}

      {record.workoutType === 'strength' && record.exercises.map((exerciseRecord, exIndex) => {
        const exercise = exercises.find(e => e.id === exerciseRecord.exerciseId);
        if (!exercise) return null;

        return (
          <Card key={exerciseRecord.exerciseId} style={styles.card}>
            <Card.Content>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseTitleRow}>
                  <Avatar.Icon size={32} icon="dumbbell" style={styles.exerciseIcon} color="#6366F1" />
                  <View>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              {exerciseRecord.sets?.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <View style={styles.setLeft}>
                    <View style={styles.setNumberBadge}>
                      <Text style={styles.setNumber}>{set.setNumber}</Text>
                    </View>
                    <Text style={styles.setDetail}>{set.weight}kg × {set.reps}次</Text>
                  </View>
                  <IconButton
                    icon="pencil"
                    size={18}
                    iconColor="#94A3B8"
                    onPress={() => openEditDialog(exIndex, setIndex, set)}
                    style={styles.editIcon}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        );
      })}

      {record.workoutType === 'cardio' && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={20} icon="heart-pulse" style={styles.sectionIcon} color="#10B981" />
              <Text style={styles.sectionTitle}>有氧数据</Text>
            </View>
            <View style={styles.cardioInfoRow}>
              <View style={styles.cardioInfoItem}>
                <Text style={styles.cardioInfoValue}>{record.duration}</Text>
                <Text style={styles.cardioInfoLabel}>时长(分钟)</Text>
              </View>
              {record.totalDistance !== undefined && (
                <View style={styles.cardioInfoItem}>
                  <Text style={styles.cardioInfoValue}>{record.totalDistance.toFixed(1)}</Text>
                  <Text style={styles.cardioInfoLabel}>距离(km)</Text>
                </View>
              )}
              {record.totalCalories !== undefined && (
                <View style={styles.cardioInfoItem}>
                  <Text style={styles.cardioInfoValue}>{record.totalCalories}</Text>
                  <Text style={styles.cardioInfoLabel}>消耗(kcal)</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.deleteButton}
          labelStyle={styles.deleteButtonLabel}
          icon="delete"
          textColor="#EF4444"
        >
          删除记录
        </Button>
      </View>

      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)} style={styles.editDialog}>
          <Dialog.Title style={styles.editDialogTitle}>编辑组数据</Dialog.Title>
          <Dialog.Content>
            <View style={styles.editInputs}>
              <TextInput
                label="重量(kg)"
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="numeric"
                style={styles.editInput}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
              />
              <TextInput
                label="次数"
                value={editReps}
                onChangeText={setEditReps}
                keyboardType="numeric"
                style={styles.editInput}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)} textColor="#64748B">取消</Button>
            <Button onPress={saveEdit} textColor="#6366F1">保存</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
  },
  overviewCard: {
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  planDetail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  exerciseHeader: {
    marginBottom: 8,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  exerciseCategory: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#F1F5F9',
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
  editIcon: {
    margin: 0,
  },
  cardioInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  cardioInfoItem: {
    alignItems: 'center',
  },
  cardioInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  cardioInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  actionButtons: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  deleteButton: {
    borderRadius: 12,
    borderColor: '#EF4444',
  },
  deleteButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  noRecordText: {
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
  editDialog: {
    borderRadius: 16,
  },
  editDialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  editInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
