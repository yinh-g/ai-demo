import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Button, FAB, Avatar, Portal, Dialog, IconButton } from 'react-native-paper';
import { useAppStore } from '../store';
import { WorkoutPlan } from '../types';

export default function PlanScreen({ navigation }: any) {
  const { workoutPlans, workoutRecords, deleteWorkoutPlan } = useAppStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null);

  const getPlanStatus = (plan: WorkoutPlan) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = workoutRecords.find(r => r.date === today && r.planId === plan.id);
    if (todayRecord) {
      return todayRecord.status === 'completed' ? '今日已完成' : '今日已取消';
    }
    return '待训练';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '今日已完成': return '#10B981';
      case '今日已取消': return '#EF4444';
      default: return '#6366F1';
    }
  };

  const handleDelete = (plan: WorkoutPlan) => {
    setPlanToDelete(plan);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (planToDelete) {
      deleteWorkoutPlan(planToDelete.id);
      setShowDeleteDialog(false);
      setPlanToDelete(null);
    }
  };

  const handleEdit = (plan: WorkoutPlan) => {
    navigation.navigate('CreatePlan', { editPlanId: plan.id });
  };

  const renderPlan = ({ item }: { item: WorkoutPlan }) => {
    const status = getPlanStatus(item);
    const statusColor = getStatusColor(status);

    return (
      <Card style={styles.planCard}>
        <Card.Content>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{item.name}</Text>
              <View style={styles.planMeta}>
                <View style={styles.metaItem}>
                  <Avatar.Icon size={16} icon="dumbbell" style={styles.metaIcon} color="#6366F1" />
                  <Text style={styles.planDetail}>{item.exercises.length} 个动作</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.planStatus, { color: statusColor }]}>{status}</Text>
                </View>
              </View>
            </View>
            <View style={styles.actionIcons}>
              <IconButton
                icon="pencil"
                size={20}
                iconColor="#6366F1"
                onPress={() => handleEdit(item)}
                style={styles.iconButton}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor="#EF4444"
                onPress={() => handleDelete(item)}
                style={styles.iconButton}
              />
            </View>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('WorkoutSession', { planId: item.id })}
            style={[styles.actionButton, { backgroundColor: statusColor }]}
            labelStyle={styles.actionButtonLabel}
            icon="play"
          >
            开始训练
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="calendar-check" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.sectionTitle}>我的计划</Text>
      </View>

      {workoutPlans.length === 0 ? (
        <View style={styles.emptyState}>
          <Avatar.Icon size={80} icon="calendar-blank" style={styles.emptyIcon} color="#CBD5E1" />
          <Text style={styles.emptyText}>暂无训练计划</Text>
          <Text style={styles.emptySubtext}>创建你的第一个训练计划，开始健身之旅</Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('CreatePlan')}
            style={styles.createButton}
            labelStyle={styles.createButtonLabel}
            icon="plus"
          >
            创建第一个计划
          </Button>
        </View>
      ) : (
        <FlatList
          data={workoutPlans}
          renderItem={renderPlan}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePlan')}
        color="#fff"
      />

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>删除计划</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.deleteText}>
              确定要删除计划"{planToDelete?.name}"吗？此操作不可恢复。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} textColor="#64748B">取消</Button>
            <Button onPress={confirmDelete} mode="contained" style={{ borderRadius: 8, backgroundColor: '#EF4444' }}>
              删除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  list: {
    paddingBottom: 80,
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    backgroundColor: 'transparent',
    marginRight: 4,
  },
  planDetail: {
    fontSize: 14,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  planStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: {
    margin: 0,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actionButton: {
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    width: 200,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
    borderRadius: 16,
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  deleteText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
});
