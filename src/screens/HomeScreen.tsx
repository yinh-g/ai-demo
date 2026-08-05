import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider, Avatar, ProgressBar, TextInput, Portal, Dialog } from 'react-native-paper';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store';

export default function HomeScreen({ navigation }: any) {
  const { workoutPlans, workoutRecords, dailyActivities, setDailyActivity, getTodayActivity } = useAppStore();
  const todayActivity = getTodayActivity();

  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityInput, setActivityInput] = useState({ steps: '', calories: '', distance: '' });
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);

  // 自动同步计步器数据
  useEffect(() => {
    let subscription: any;
    let isMounted = true;

    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!isMounted) return;
        setIsPedometerAvailable(available);

        if (available) {
          const now = new Date();
          const today = now.toISOString().split('T')[0];

          // 获取今日步数（从0点开始）
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const result = await Pedometer.getStepCountAsync(startOfDay, now);

          if (result && isMounted) {
            const estimatedCalories = Math.round(result.steps * 0.04);
            const estimatedDistance = parseFloat((result.steps * 0.0007).toFixed(1));
            setDailyActivity({
              date: today,
              steps: result.steps,
              activeCalories: estimatedCalories,
              distanceKm: estimatedDistance,
              source: 'health_connect',
              updatedAt: Date.now(),
            });
          }

          // 保存本次打开时间
          await AsyncStorage.setItem('lastAppOpenTime', now.toISOString());

          // 监听实时步数变化
          subscription = Pedometer.watchStepCount(result => {
            if (!isMounted) return;
            const today = new Date().toISOString().split('T')[0];
            const estimatedCalories = Math.round(result.steps * 0.04);
            const estimatedDistance = parseFloat((result.steps * 0.0007).toFixed(1));
            setDailyActivity({
              date: today,
              steps: result.steps,
              activeCalories: estimatedCalories,
              distanceKm: estimatedDistance,
              source: 'health_connect',
              updatedAt: Date.now(),
            });
          });
        }
      } catch (error) {
        console.error('Pedometer error:', error);
        if (isMounted) setIsPedometerAvailable(false);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const handleSaveActivity = () => {
    const steps = parseInt(activityInput.steps) || 0;
    const calories = parseInt(activityInput.calories) || 0;
    const distance = parseFloat(activityInput.distance) || 0;

    if (steps <= 0 && calories <= 0) {
      Alert.alert('提示', '请至少输入步数或消耗卡路里');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setDailyActivity({
      date: today,
      steps,
      activeCalories: calories,
      distanceKm: distance,
      source: 'manual',
      updatedAt: Date.now(),
    });
    setShowActivityDialog(false);
    setActivityInput({ steps: '', calories: '', distance: '' });
  };

  const recentRecords = workoutRecords.slice(-3).reverse();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'strength': return 'dumbbell';
      case 'cardio': return 'run';
      default: return 'dumbbell';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'strength': return '力量训练';
      case 'cardio': return '有氧训练';
      default: return '训练';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FitTrack</Text>
        <Text style={styles.headerSubtitle}>记录每一次突破</Text>
      </View>

      {/* 今日活动 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日活动</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isPedometerAvailable && (
                <View style={styles.autoSyncBadge}>
                  <Avatar.Icon size={12} icon="sync" style={{ backgroundColor: 'transparent' }} color="#10B981" />
                  <Text style={styles.autoSyncText}>自动</Text>
                </View>
              )}
              <Button
                mode="text"
                onPress={() => setShowActivityDialog(true)}
                labelStyle={{ fontSize: 13, color: '#6366F1' }}
                icon="pencil"
                compact
              >
                {todayActivity ? '更新' : '记录'}
              </Button>
            </View>
          </View>

          {todayActivity ? (
            <View style={styles.activityRow}>
              <View style={styles.activityItem}>
                <Avatar.Icon size={28} icon="walk" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
                <Text style={styles.activityValue}>{todayActivity.steps.toLocaleString()}</Text>
                <Text style={styles.activityLabel}>步数</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Avatar.Icon size={28} icon="fire" style={{ backgroundColor: 'transparent' }} color="#EF4444" />
                <Text style={styles.activityValue}>{todayActivity.activeCalories}</Text>
                <Text style={styles.activityLabel}>消耗(kcal)</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityItem}>
                <Avatar.Icon size={28} icon="map-marker-distance" style={{ backgroundColor: 'transparent' }} color="#10B981" />
                <Text style={styles.activityValue}>{todayActivity.distanceKm.toFixed(1)}</Text>
                <Text style={styles.activityLabel}>距离(km)</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>
                {isPedometerAvailable
                  ? '正在同步步数数据...'
                  : '记录今日步数和消耗，让预测更准确'}
              </Text>
              {!isPedometerAvailable && (
                <Button
                  mode="outlined"
                  onPress={() => setShowActivityDialog(true)}
                  style={styles.recordActivityButton}
                  labelStyle={{ fontSize: 13, color: '#6366F1' }}
                  icon="plus"
                >
                  记录活动数据
                </Button>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 训练计划 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>训练计划</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Plans')}
              labelStyle={{ fontSize: 13, color: '#6366F1' }}
              icon="plus"
              compact
            >
              新建
            </Button>
          </View>
          
          {workoutPlans.length > 0 ? (
            workoutPlans.slice(0, 3).map((plan, index) => (
              <View key={plan.id}>
                <View style={styles.planItem}>
                  <View style={styles.planLeft}>
                    <Avatar.Icon size={40} icon="clipboard-list" style={styles.planIcon} color="#6366F1" />
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDetail}>{plan.exercises.length} 个动作</Text>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('WorkoutSession', { planId: plan.id })}
                    style={styles.startButton}
                    labelStyle={styles.startButtonLabel}
                  >
                    开始
                  </Button>
                </View>
                {index < Math.min(workoutPlans.length, 3) - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Avatar.Icon size={48} icon="clipboard-outline" style={styles.emptyIcon} color="#CBD5E1" />
              <Text style={styles.noPlanText}>还没有训练计划</Text>
              <Text style={styles.noPlanSub}>点击上方"新建"创建你的第一个计划</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 快速开始 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>快速开始</Text>
          </View>
          <View style={styles.quickActions}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Training')}
              style={[styles.quickButton, { backgroundColor: '#6366F1' }]}
              labelStyle={styles.quickButtonLabel}
              icon="dumbbell"
            >
              力量训练
            </Button>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CardioSession')}
              style={[styles.quickButton, { backgroundColor: '#10B981' }]}
              labelStyle={styles.quickButtonLabel}
              icon="run"
            >
              有氧训练
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 最近训练 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近训练</Text>
            <Text style={styles.sectionSubtitle}>最近3次</Text>
          </View>
          
          {recentRecords.length > 0 ? (
            recentRecords.map((record, index) => (
              <View key={record?.id || index}>
                <View
                  style={styles.recordItem}
                  onTouchEnd={() => record?.id && navigation.navigate('WorkoutRecordDetail', { recordId: record.id })}
                >
                  <View style={styles.recordLeft}>
                    <Avatar.Icon size={40} icon="check-circle" style={styles.recordIcon} color="#10B981" />
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordDate}>{record?.date || ''}</Text>
                      <Text style={styles.recordVolume}>
                        容量: {(record?.totalVolume || 0).toLocaleString()} kg
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={styles.recordDuration}>{record?.duration || 0} 分钟</Text>
                  </View>
                </View>
                {index < recentRecords.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Avatar.Icon size={48} icon="calendar-blank" style={styles.emptyIcon} color="#CBD5E1" />
              <Text style={styles.noRecord}>还没有训练记录</Text>
              <Text style={styles.noRecordSub}>完成一次训练后，记录会显示在这里</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 活动数据弹窗 */}
      <Portal>
        <Dialog visible={showActivityDialog} onDismiss={() => setShowActivityDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>记录今日活动</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="步数"
              value={activityInput.steps}
              onChangeText={text => setActivityInput({ ...activityInput, steps: text })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              left={<TextInput.Icon icon="walk" color="#94A3B8" />}
            />
            <TextInput
              label="活跃消耗 (kcal)"
              value={activityInput.calories}
              onChangeText={text => setActivityInput({ ...activityInput, calories: text })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              left={<TextInput.Icon icon="fire" color="#94A3B8" />}
            />
            <TextInput
              label="距离 (km)"
              value={activityInput.distance}
              onChangeText={text => setActivityInput({ ...activityInput, distance: text })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              left={<TextInput.Icon icon="map-marker-distance" color="#94A3B8" />}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowActivityDialog(false)} textColor="#64748B">取消</Button>
            <Button onPress={handleSaveActivity} mode="contained" style={{ borderRadius: 8, backgroundColor: '#6366F1' }}>保存</Button>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planIcon: {
    backgroundColor: '#EEF2FF',
  },
  planInfo: {
    marginLeft: 12,
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
  startButton: {
    borderRadius: 10,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
  },
  startButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#F1F5F9',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  quickButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    backgroundColor: '#ECFDF5',
  },
  recordInfo: {
    marginLeft: 12,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  recordVolume: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  noPlanText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  noPlanSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  noRecord: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  noRecordSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityItem: {
    alignItems: 'center',
    flex: 1,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  activityLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  activityDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  recordActivityButton: {
    borderRadius: 8,
    borderColor: '#6366F1',
  },
  autoSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  autoSyncText: {
    fontSize: 11,
    color: '#10B981',
    marginLeft: 2,
    fontWeight: '500',
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});
