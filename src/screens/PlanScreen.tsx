import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Button, FAB } from 'react-native-paper';
import { useAppStore } from '../store';
import { WorkoutPlan } from '../types';

export default function PlanScreen({ navigation }: any) {
  const { workoutPlans, workoutRecords } = useAppStore();

  const getPlanStatus = (plan: WorkoutPlan) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = workoutRecords.find(r => r.date === today && r.planId === plan.id);
    if (todayRecord) {
      return todayRecord.status === 'completed' ? '今日已完成' : '今日已取消';
    }
    return '待训练';
  };

  const renderPlan = ({ item }: { item: WorkoutPlan }) => (
    <Card style={styles.planCard}>
      <Card.Content>
        <Text style={styles.planName}>{item.name}</Text>
        <Text style={styles.planDetail}>{item.exercises.length} 个动作</Text>
        <Text style={styles.planStatus}>{getPlanStatus(item)}</Text>
      </Card.Content>
      <Card.Actions>
        <Button 
          mode="contained"
          onPress={() => navigation.navigate('WorkoutSession', { planId: item.id })}
        >
          开始训练
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📌 我的计划</Text>
      
      {workoutPlans.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>暂无训练计划</Text>
          <Button 
            mode="contained"
            onPress={() => navigation.navigate('CreatePlan')}
            style={styles.createButton}
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
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePlan')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  list: {
    paddingBottom: 80,
  },
  planCard: {
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planStatus: {
    fontSize: 12,
    color: '#1A5F7A',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  createButton: {
    width: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A5F7A',
  },
});
