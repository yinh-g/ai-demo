import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, Divider, TouchableRipple, SegmentedButtons } from 'react-native-paper';
import { useAppStore } from '../store';
import { rangeLabels, Range } from './StatsDetailScreen';

// range 起始时间戳（与 StatsDetailScreen 的 getRangeStart 保持一致）
function rangeStartMs(range: Range): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6); return d.getTime();
  }
  if (range === 'month') {
    const d = new Date(today); d.setDate(d.getDate() - 29); return d.getTime();
  }
  return new Date(today.getFullYear(), today.getMonth() - 11, 1).getTime();
}

export default function StatsScreen({ navigation }: any) {
  const { workoutRecords, exercises, dailyActivities } = useAppStore();
  const [range, setRange] = useState<Range>('week');
  const rStart = rangeStartMs(range);

  const totalWorkouts = workoutRecords.filter(r => r.status === 'completed').length;
  const totalVolume = workoutRecords.reduce((sum, r) => sum + r.totalVolume, 0);
  const totalDuration = workoutRecords.reduce((sum, r) => sum + r.duration, 0);

  // 按 range 过滤
  const rangeRecords = workoutRecords.filter(r => r.status === 'completed' && new Date(r.date).getTime() >= rStart);
  const rangeVolume = rangeRecords.reduce((sum, r) => sum + r.totalVolume, 0);
  const rangeDuration = rangeRecords.reduce((sum, r) => sum + r.duration, 0);

  const strengthRecords = workoutRecords.filter(r => r.workoutType === 'strength' && r.status === 'completed');
  const cardioRecords = workoutRecords.filter(r => r.workoutType === 'cardio' && r.status === 'completed');

  const totalCardioDistance = cardioRecords.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
  const totalCardioCalories = cardioRecords.reduce((sum, r) => sum + (r.totalCalories || 0), 0);
  const totalCardioDuration = cardioRecords.reduce((sum, r) => sum + r.duration, 0);

  const rangeCardioRecords = rangeRecords.filter(r => r.workoutType === 'cardio');
  const rangeCardioDistance = rangeCardioRecords.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
  const rangeCardioCalories = rangeCardioRecords.reduce((sum, r) => sum + (r.totalCalories || 0), 0);

  const muscleDistribution = () => {
    const distribution: Record<string, number> = {};
    rangeRecords.forEach(record => {
      record.exercises.forEach(exercise => {
        const ex = exercises.find(e => e.id === exercise.exerciseId);
        if (ex) {
          distribution[ex.category] = (distribution[ex.category] || 0) + exercise.sets.length;
        }
      });
    });
    return distribution;
  };

  const categoryLabels: Record<string, string> = {
    chest: '胸部',
    back: '背部',
    legs: '腿部',
    shoulders: '肩部',
    arms: '手臂',
    core: '核心',
    cardio: '有氧'
  };

  const categoryIcons: Record<string, string> = {
    chest: 'heart',
    back: 'arrow-left-right',
    legs: 'walk',
    shoulders: 'human',
    arms: 'arm-flex',
    core: 'circle-slice-4',
    cardio: 'run'
  };

  const categoryColors: Record<string, string> = {
    chest: '#EF4444',
    back: '#3B82F6',
    legs: '#8B5CF6',
    shoulders: '#F59E0B',
    arms: '#10B981',
    core: '#EC4899',
    cardio: '#06B6D4'
  };

  const muscleDist = muscleDistribution();
  const totalSets = Object.values(muscleDist).reduce((a, b) => a + b, 0);

  // 按 range 过滤活动数据
  const rangeActivities = dailyActivities.filter(a => new Date(a.date).getTime() >= rStart);
  const totalSteps = rangeActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalActivityCalories = rangeActivities.reduce((sum, a) => sum + a.activeCalories, 0);
  const totalDistance = rangeActivities.reduce((sum, a) => sum + a.distanceKm, 0);
  const avgSteps = rangeActivities.length > 0 ? Math.round(totalSteps / rangeActivities.length) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="chart-bar" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>数据统计</Text>
      </View>

      <SegmentedButtons
        value={range}
        onValueChange={(v) => setRange(v as Range)}
        buttons={[
          { value: 'week', label: '周' },
          { value: 'month', label: '月' },
          { value: 'year', label: '年' },
        ]}
        style={styles.rangeSwitch}
      />

      <Card style={[styles.card, styles.overviewCard]}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练概览</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Avatar.Icon size={28} icon="dumbbell" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
              </View>
              <Text style={styles.statNumber}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>总训练次数</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Avatar.Icon size={28} icon="weight-kilogram" style={{ backgroundColor: 'transparent' }} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Avatar.Icon size={28} icon="clock-outline" style={{ backgroundColor: 'transparent' }} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{Math.floor(totalDuration / 60)}</Text>
              <Text style={styles.statLabel}>总时长(小时)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 活动统计 */}
      <Card style={styles.card}>
        <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'activity', range })} borderless>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="walk" style={styles.sectionIcon} color="#6366F1" />
              <Text style={styles.sectionTitle}>{rangeLabels[range]}活动</Text>
              <View style={styles.chevronWrap}>
                <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color="#94A3B8" />
                <Text style={styles.tapHint}>查看趋势图</Text>
              </View>
            </View>
            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{totalSteps.toLocaleString()}</Text>
                <Text style={styles.weekLabel}>总步数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{avgSteps.toLocaleString()}</Text>
                <Text style={styles.weekLabel}>日均步数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{totalActivityCalories}</Text>
                <Text style={styles.weekLabel}>消耗(kcal)</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{totalDistance.toFixed(1)}</Text>
                <Text style={styles.weekLabel}>距离(km)</Text>
              </View>
            </View>
          </Card.Content>
        </TouchableRipple>
      </Card>

      <Card style={styles.card}>
        <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'stats', range })} borderless>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="calendar-week" style={styles.sectionIcon} color="#10B981" />
              <Text style={styles.sectionTitle}>{rangeLabels[range]}统计</Text>
              <View style={styles.chevronWrap}>
                <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color="#94A3B8" />
                <Text style={styles.tapHint}>查看柱状图</Text>
              </View>
            </View>
            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{rangeRecords.length}</Text>
                <Text style={styles.weekLabel}>训练次数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{(rangeVolume / 1000).toFixed(1)}k</Text>
                <Text style={styles.weekLabel}>总容量(kg)</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{rangeDuration}</Text>
                <Text style={styles.weekLabel}>总时长(分钟)</Text>
              </View>
            </View>
          </Card.Content>
        </TouchableRipple>
      </Card>

      {totalSets > 0 && (
        <Card style={styles.card}>
          <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'muscle', range })} borderless>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Avatar.Icon size={24} icon="chart-pie" style={styles.sectionIcon} color="#F59E0B" />
                <Text style={styles.sectionTitle}>肌群分布</Text>
                <View style={styles.chevronWrap}>
                  <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color="#94A3B8" />
                  <Text style={styles.tapHint}>查看热力图</Text>
                </View>
              </View>
            {Object.entries(muscleDist).map(([category, count]) => {
              const percentage = ((count / totalSets) * 100).toFixed(1);
              const color = categoryColors[category] || '#6366F1';
              return (
                <View key={category} style={styles.muscleBar}>
                  <View style={styles.muscleLabelContainer}>
                    <Avatar.Icon
                      size={20}
                      icon={categoryIcons[category] || 'dumbbell'}
                      style={[styles.muscleIcon, { backgroundColor: color + '20' }]}
                      color={color}
                    />
                    <Text style={styles.muscleLabel}>{categoryLabels[category] || category}</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.musclePercent, { color }]}>{percentage}%</Text>
                </View>
              );
            })}
            </Card.Content>
          </TouchableRipple>
        </Card>
      )}

      {cardioRecords.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="heart-pulse" style={styles.sectionIcon} color="#10B981" />
              <Text style={styles.sectionTitle}>有氧统计</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Avatar.Icon size={28} icon="map-marker-distance" style={{ backgroundColor: 'transparent' }} color="#10B981" />
                </View>
                <Text style={styles.statNumberDark}>{totalCardioDistance.toFixed(1)}</Text>
                <Text style={styles.statLabelDark}>总距离(km)</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Avatar.Icon size={28} icon="fire" style={{ backgroundColor: 'transparent' }} color="#F59E0B" />
                </View>
                <Text style={styles.statNumberDark}>{totalCardioCalories}</Text>
                <Text style={styles.statLabelDark}>总消耗(kcal)</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#EEF2FF' }]}>
                  <Avatar.Icon size={28} icon="clock-outline" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
                </View>
                <Text style={styles.statNumberDark}>{Math.floor(totalCardioDuration / 60)}</Text>
                <Text style={styles.statLabelDark}>总时长(小时)</Text>
              </View>
            </View>

            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{rangeCardioRecords.length}</Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}次数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{rangeCardioDistance.toFixed(1)}</Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}距离(km)</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber}>{rangeCardioCalories}</Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}消耗(kcal)</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={24} icon="history" style={styles.sectionIcon} color="#6366F1" />
            <Text style={styles.sectionTitle}>历史记录</Text>
          </View>
          {strengthRecords.length > 0 ? (
            strengthRecords.slice(-5).reverse().map((record, index) => (
              <View key={record.id}>
                <View
                  style={styles.recordItem}
                  onTouchEnd={() => navigation.navigate('WorkoutRecordDetail', { recordId: record.id })}
                >
                  <View style={styles.recordLeft}>
                    <Avatar.Icon size={36} icon="dumbbell" style={styles.recordIcon} color="#6366F1" />
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordDate}>{record.date}</Text>
                      <Text style={styles.recordVolume}>
                        容量: {(record.totalVolume || 0).toLocaleString()} kg · {record.duration}分钟
                      </Text>
                    </View>
                  </View>
                  <Avatar.Icon size={20} icon="chevron-right" style={{ backgroundColor: 'transparent' }} color="#94A3B8" />
                </View>
                {index < Math.min(strengthRecords.length, 5) - 1 && <Divider style={styles.recordDivider} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.noRecord}>暂无训练记录</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('Prediction')}
        style={styles.predictionButton}
        labelStyle={styles.predictionButtonLabel}
        icon="trending-up"
      >
        查看身体预测
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  rangeSwitch: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewCard: {
    backgroundColor: '#6366F1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  chevron: {
    backgroundColor: 'transparent',
  },
  tapHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 2,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statNumberDark: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabelDark: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekStat: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  weekNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  weekLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  muscleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  muscleIcon: {
    marginRight: 6,
  },
  muscleLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  musclePercent: {
    width: 44,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: 'bold',
  },
  predictionButton: {
    marginVertical: 20,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    paddingVertical: 4,
  },
  predictionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    backgroundColor: '#EEF2FF',
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
  recordDivider: {
    marginVertical: 4,
    backgroundColor: '#F1F5F9',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRecord: {
    fontSize: 15,
    color: '#94A3B8',
  },
});
