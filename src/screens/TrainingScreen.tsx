import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useAppStore } from '../store';

export default function TrainingScreen({ navigation }: any) {
  const { currentWorkout, workoutPlans } = useAppStore();

  // 如果有正在进行的训练，显示训练状态
  if (currentWorkout) {
    return (
      <View style={styles.container}>
        <Card style={styles.activeCard}>
          <Card.Content>
            <Text style={styles.activeTitle}>🏋️ 训练进行中</Text>
            <Text style={styles.activeText}>您有一个正在进行的训练</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('WorkoutSession')}
              style={styles.continueButton}
            >
              继续训练
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>开始训练</Text>
      
      {workoutPlans.length > 0 ? (
        <>
          <Text style={styles.subtitle}>选择计划开始训练</Text>
          {workoutPlans.map((plan) => (
            <Card key={plan.id} style={styles.planCard}>
              <Card.Content>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDetail}>{plan.exercises.length} 个动作</Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('WorkoutSession', { planId: plan.id })}
                >
                  开始训练
                </Button>
              </Card.Actions>
            </Card>
          ))}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>您还没有创建训练计划</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreatePlan')}
              style={styles.createButton}
            >
              创建计划
            </Button>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
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
  activeCard: {
    backgroundColor: '#1A5F7A',
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  activeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#fff',
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  createButton: {
    marginTop: 10,
  },
});
