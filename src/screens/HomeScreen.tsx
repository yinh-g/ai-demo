import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider, Avatar, ProgressBar } from 'react-native-paper';
import { useAppStore } from '../store';

export default function HomeScreen({ navigation }: any) {
  const { workoutPlans, workoutRecords } = useAppStore();
  
  const getTodayString = () => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
  
  const today = getTodayString();
  const todayRecord = workoutRecords?.find(r => r && r.date === today) || null;
  const recentRecords = Array.isArray(workoutRecords) ? workoutRecords.slice(-3).reverse() : [];
  
  const getWeekDays = () => {
    try {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      return days;
    } catch {
      return [];
    }
  };
  
  const weekDays = getWeekDays();
  const trainedDays = weekDays.filter(date => 
    workoutRecords?.some(r => r && r.date === date && r.status === 'completed')
  );

  const getDisplayDate = () => {
    try {
      return new Date().toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
      });
    } catch {
      return new Date().toDateString();
    }
  };

  const getDayName = (dateStr: string) => {
    try {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayIndex = new Date(dateStr).getDay();
      return dayNames[dayIndex] || '';
    } catch {
      return '';
    }
  };

  const weekProgress = trainedDays.length / 7;

  return (
    <ScrollView style={styles.container}>
      {/* 顶部欢迎区域 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>早上好, 训练者</Text>
            <Text style={styles.date}>{getDisplayDate()}</Text>
          </View>
          <Avatar.Icon size={48} icon="arm-flex" style={styles.headerIcon} color="#6366F1" />
        </View>
      </View>

      {/* 今日训练卡片 */}
      <Card style={[styles.card, styles.featuredCard]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Avatar.Icon size={40} icon="lightning-bolt" style={styles.featuredIcon} color="#fff" />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>今日计划</Text>
              <Text style={styles.cardSubtitle}>
                {todayRecord ? '已完成今日训练' : '准备好开始训练了吗?'}
              </Text>
            </View>
          </View>
          
          {todayRecord ? (
            <View style={styles.completedContainer}>
              <View style={styles.statRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{todayRecord.duration || 0}</Text>
                  <Text style={styles.statUnit}>分钟</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{(todayRecord.totalVolume || 0).toLocaleString()}</Text>
                  <Text style={styles.statUnit}>kg容量</Text>
                </View>
              </View>
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('Stats')}
                style={styles.secondaryButton}
                labelStyle={styles.secondaryButtonLabel}
                icon="chart-bar"
              >
                查看统计
              </Button>
            </View>
          ) : workoutPlans && workoutPlans.length > 0 ? (
            <View>
              <Text style={styles.planName}>{workoutPlans[0]?.name || '未命名计划'}</Text>
              <Text style={styles.planDetail}>
                {(workoutPlans[0]?.exercises?.length || 0)} 个动作 · 预计 {(workoutPlans[0]?.exercises?.length || 0) * 5} 分钟
              </Text>
              <Button 
                mode="contained" 
                onPress={() => {
                  if (workoutPlans[0]?.id) {
                    navigation.navigate('WorkoutSession', { planId: workoutPlans[0].id });
                  }
                }}
                style={styles.primaryButton}
                labelStyle={styles.primaryButtonLabel}
                icon="play"
              >
                开始训练
              </Button>
            </View>
          ) : (
            <View>
              <Text style={styles.planName}>暂无计划</Text>
              <Text style={styles.planDetail}>创建你的第一个训练计划</Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('CreatePlan')}
                style={styles.primaryButton}
                labelStyle={styles.primaryButtonLabel}
                icon="plus"
              >
                创建计划
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 本周概览 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>本周概览</Text>
            <Text style={styles.sectionSubtitle}>{trainedDays.length}/7 天</Text>
          </View>
          
          <ProgressBar progress={weekProgress} color="#6366F1" style={styles.progressBar} />
          
          <View style={styles.weekOverview}>
            {weekDays.map((date, index) => {
              const isTrained = trainedDays.includes(date);
              const dayName = getDayName(date);
              const isToday = date === today;
              return (
                <View key={date + index} style={styles.dayIndicator}>
                  <View style={[
                    styles.dayCircle,
                    isTrained && styles.dayCircleTrained,
                    isToday && styles.dayCircleToday
                  ]}>
                    <Text style={[
                      styles.dayStatus,
                      isTrained && styles.dayStatusTrained
                    ]}>
                      {isTrained ? '✓' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* 快速操作 */}
      <View style={styles.quickActions}>
        <Card style={[styles.quickCard, styles.quickCardPrimary]} onPress={() => navigation.navigate('CreatePlan')}>
          <Card.Content style={styles.quickCardContent}>
            <Avatar.Icon size={36} icon="plus-circle" style={styles.quickIcon} color="#6366F1" />
            <Text style={styles.quickText}>新建计划</Text>
          </Card.Content>
        </Card>
        
        <Card style={[styles.quickCard, styles.quickCardSecondary]} onPress={() => navigation.navigate('ExerciseLibrary')}>
          <Card.Content style={styles.quickCardContent}>
            <Avatar.Icon size={36} icon="dumbbell" style={styles.quickIcon} color="#10B981" />
            <Text style={styles.quickText}>动作库</Text>
          </Card.Content>
        </Card>
      </View>

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
                <View style={styles.recordItem}>
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
              <Avatar.Icon size={48} icon="run" style={styles.emptyIcon} color="#CBD5E1" />
              <Text style={styles.noRecord}>暂无训练记录</Text>
              <Text style={styles.noRecordSub}>开始你的第一次训练吧!</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  date: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  headerIcon: {
    backgroundColor: '#EEF2FF',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: '#fff',
  },
  featuredCard: {
    backgroundColor: '#6366F1',
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  completedContainer: {
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  planDetail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  primaryButtonLabel: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
  },
  secondaryButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    color: '#64748B',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
  },
  weekOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayIndicator: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayCircleTrained: {
    backgroundColor: '#6366F1',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  dayStatus: {
    fontSize: 16,
    color: '#94A3B8',
  },
  dayStatusTrained: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayName: {
    fontSize: 12,
    color: '#64748B',
  },
  dayNameToday: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 2,
  },
  quickCardPrimary: {
    backgroundColor: '#EEF2FF',
  },
  quickCardSecondary: {
    backgroundColor: '#ECFDF5',
  },
  quickCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  quickIcon: {
    backgroundColor: 'transparent',
  },
  quickText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
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
    backgroundColor: '#ECFDF5',
  },
  recordInfo: {
    marginLeft: 12,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  recordVolume: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  recordRight: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recordDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  divider: {
    marginVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  noRecord: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  noRecordSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
});
