import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { useAppStore } from '../store';

export default function HomeScreen({ navigation }: any) {
  const { workoutPlans, workoutRecords } = useAppStore();
  
  // 安全地获取今日日期
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
  
  // 计算本周训练天数
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

  // 安全获取日期显示
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

  // 安全获取星期名称
  const getDayName = (dateStr: string) => {
    try {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayIndex = new Date(dateStr).getDay();
      return dayNames[dayIndex] || '';
    } catch {
      return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FitTrack</Text>
        <Text style={styles.date}>{getDisplayDate()}</Text>
      </View>

      {/* 今日训练卡片 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>今日计划</Text>
          {todayRecord ? (
            <>
              <Text style={styles.planName}>今日已完成训练</Text>
              <Text style={styles.planDetail}>
                训练时长: {todayRecord.duration || 0} 分钟
              </Text>
              <Text style={styles.planDetail}>
                总容量: {(todayRecord.totalVolume || 0).toLocaleString()} kg
              </Text>
            </>
          ) : workoutPlans && workoutPlans.length > 0 ? (
            <>
              <Text style={styles.planName}>{workoutPlans[0]?.name || '未命名计划'}</Text>
              <Text style={styles.planDetail}>
                {(workoutPlans[0]?.exercises?.length || 0)} 个动作
              </Text>
              <Button 
                mode="contained" 
                onPress={() => {
                  if (workoutPlans[0]?.id) {
                    navigation.navigate('WorkoutSession', { planId: workoutPlans[0].id });
                  }
                }}
                style={styles.startButton}
              >
                开始训练
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.planName}>暂无计划</Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('CreatePlan')}
                style={styles.startButton}
              >
                创建计划
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* 快速开始 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>快速开始</Text>
          <View style={styles.quickStartButtons}>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('CreatePlan')}
              style={styles.quickButton}
            >
              从模板创建
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => {
                if (workoutPlans && workoutPlans.length > 0) {
                  navigation.navigate('WorkoutSession', { planId: workoutPlans[0].id });
                }
              }}
              style={styles.quickButton}
              disabled={!workoutPlans || workoutPlans.length === 0}
            >
              自由训练
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 本周概览 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>本周概览</Text>
          <View style={styles.weekOverview}>
            {weekDays.map((date, index) => {
              const isTrained = trainedDays.includes(date);
              const dayName = getDayName(date);
              return (
                <View key={date + index} style={styles.dayIndicator}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={[styles.dayStatus, isTrained && styles.dayTrained]}>
                    {isTrained ? '✓' : '○'}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.weekSummary}>
            本周已训练 {trainedDays.length}/7 天
          </Text>
        </Card.Content>
      </Card>

      {/* 最近训练 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>最近训练</Text>
          {recentRecords.length > 0 ? (
            recentRecords.map((record, index) => (
              <View key={record?.id || index} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordDate}>{record?.date || ''}</Text>
                  <Text style={styles.recordDuration}>{record?.duration || 0} 分钟</Text>
                </View>
                <Text style={styles.recordVolume}>
                  总容量: {(record?.totalVolume || 0).toLocaleString()} kg
                </Text>
                <Divider style={styles.divider} />
              </View>
            ))
          ) : (
            <Text style={styles.noRecord}>暂无训练记录</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    margin: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  planDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  startButton: {
    marginTop: 12,
  },
  quickStartButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  weekOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayIndicator: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayStatus: {
    fontSize: 20,
    color: '#ccc',
  },
  dayTrained: {
    color: '#28A745',
    fontWeight: 'bold',
  },
  weekSummary: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  recordItem: {
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  recordDuration: {
    fontSize: 14,
    color: '#666',
  },
  recordVolume: {
    fontSize: 14,
    color: '#1A5F7A',
  },
  divider: {
    marginTop: 8,
  },
  noRecord: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
});
