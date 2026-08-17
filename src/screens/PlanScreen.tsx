import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, Button, FAB, Avatar, Portal, Dialog, IconButton } from 'react-native-paper';
import { useAppStore } from '../store';
import { WorkoutPlan } from '../types';
import { theme, cardStyle, cardSpacing } from '../theme';

const presetTemplates = [
  { name: '推日计划', desc: '胸 · 肩 · 三头', icon: 'arm-flex', color: theme.colors.danger, focus: 'chest' },
  { name: '拉日计划', desc: '背 · 二头 · 后束', icon: 'weight-lifter', color: theme.colors.success, focus: 'back' },
  { name: '腿日计划', desc: '股四 · 腘绳 · 臀', icon: 'human-handsdown', color: theme.colors.warning, focus: 'legs' },
];

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
      case '今日已完成': return theme.colors.success;
      case '今日已取消': return theme.colors.danger;
      default: return theme.colors.primary;
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
                  <Avatar.Icon size={16} icon="dumbbell" style={styles.metaIcon} color={theme.colors.primary} />
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
                iconColor={theme.colors.primary}
                onPress={() => handleEdit(item)}
                style={styles.iconButton}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.danger}
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
        <Avatar.Icon size={40} icon="calendar-check" style={styles.headerIcon} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>我的计划</Text>
      </View>

      {workoutPlans.length === 0 ? (
        <ScrollView style={styles.emptyScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.emptyScrollContent}>
          <View style={styles.emptyState}>
            <Avatar.Icon size={64} icon="calendar-blank" style={styles.emptyIcon} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>暂无训练计划</Text>
            <Text style={styles.emptySubtext}>选择一个推荐模板快速开始，或自定义创建</Text>
          </View>

          {/* 推荐模板 */}
          <Text style={styles.presetTitle}>推荐模板</Text>
          <View style={styles.presetList}>
            {presetTemplates.map((tpl) => (
              <TouchableOpacity
                key={tpl.name}
                style={styles.presetCard}
                onPress={() => navigation.navigate('CreatePlan', { presetName: tpl.name, presetFocus: tpl.focus })}
                activeOpacity={0.75}
              >
                <View style={[styles.presetIconWrap, { backgroundColor: tpl.color + '15' }]}>
                  <Avatar.Icon size={32} icon={tpl.icon} style={{ backgroundColor: 'transparent' }} color={tpl.color} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{tpl.name}</Text>
                  <Text style={styles.presetDesc}>{tpl.desc}</Text>
                </View>
                <Avatar.Icon size={20} icon="plus" style={styles.presetAddIcon} color={tpl.color} />
              </TouchableOpacity>
            ))}
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('CreatePlan')}
            style={styles.customCreateButton}
            labelStyle={styles.customCreateLabel}
            icon="plus-circle-outline"
            textColor={theme.colors.primary}
          >
            自定义创建
          </Button>
        </ScrollView>
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
            <Button onPress={() => setShowDeleteDialog(false)} textColor={theme.colors.textSecondary}>取消</Button>
            <Button onPress={confirmDelete} mode="contained" style={{ borderRadius: 8, backgroundColor: theme.colors.danger }}>
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
  },
  headerIcon: {
    backgroundColor: theme.colors.primaryLight,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  list: {
    paddingBottom: 80,
  },
  planCard: { ...cardStyle, marginBottom: cardSpacing.marginBottom, },
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
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
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
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyScroll: {
    flex: 1,
  },
  emptyScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  // ── 推荐模板 ──
  presetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  presetList: {
    gap: 10,
    marginBottom: 20,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...cardStyle,
    elevation: 1,
  },
  presetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  presetDesc: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  presetAddIcon: {
    backgroundColor: 'transparent',
  },
  customCreateButton: {
    borderRadius: 12,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  customCreateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  deleteText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
});
