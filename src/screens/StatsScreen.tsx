import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useAppStore } from '../store';

export default function StatsScreen({ navigation }: any) {
  const { workoutRecords, exercises } = useAppStore();

  // 计算统计数据
  const totalWorkouts = workoutRecords.filter(r => r.status === 'completed').length;
  const totalVolume = workoutRecords.reduce((sum, r) => sum + r.totalVolume, 0);
  const totalDuration = workoutRecords.reduce((sum, r) => sum + r.duration, 0);

  // 本周数据
  const getWeekData = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    return workoutRecords.filter(r => new Date(r.date) >= weekStart && r.status === 'completed');
  };
  const weekData = getWeekData();
  const weekVolume = weekData.reduce((sum, r) => sum + r.totalVolume, 0);
  const weekDuration = weekData.reduce((sum, r) => sum + r.duration, 0);

  // 计算各肌群分布
  const muscleDistribution = () => {
    const distribution: Record<string, number> = {};
    workoutRecords.forEach(record => {
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
    core: '核心'
  };

  const muscleDist = muscleDistribution();
  const totalSets = Object.values(muscleDist).reduce((a, b) => a + b, 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 数据统计</Text>

      {/* 概览卡片 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练概览</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>总训练次数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{Math.floor(totalDuration / 60)}</Text>
              <Text style={styles.statLabel}>总时长(小时)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 本周统计 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>本周统计</Text>
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekNumber}>{weekData.length}</Text>
              <Text style={styles.weekLabel}>训练次数</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekNumber}>{(weekVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.weekLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekNumber}>{weekDuration}</Text>
              <Text style={styles.weekLabel}>总时长(分钟)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 肌群分布 */}
      {totalSets > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>肌群分布</Text>
            {Object.entries(muscleDist).map(([category, count]) => {
              const percentage = ((count / totalSets) * 100).toFixed(1);
              return (
                <View key={category} style={styles.muscleBar}>
                  <Text style={styles.muscleLabel}>{categoryLabels[category] || category}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.musclePercent}>{percentage}%</Text>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* 肌肉增长预测入口 */}
      <Button
        mode="contained"
        onPress={() => navigation.navigate('Prediction')}
        style={styles.predictionButton}
      >
        查看肌肉增长预测
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    marginLeft: 5,
  },
  card: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekStat: {
    alignItems: 'center',
  },
  weekNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28A745',
  },
  weekLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  muscleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  muscleLabel: {
    width: 60,
    fontSize: 14,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#1A5F7A',
    borderRadius: 10,
  },
  musclePercent: {
    width: 50,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  predictionButton: {
    marginVertical: 20,
  },
});
