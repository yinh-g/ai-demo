import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { useAppStore } from '../store';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises } = useAppStore();

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👤 我的</Text>

      {/* 用户信息卡片 */}
      <Card style={styles.card}>
        <Card.Content>
          {userProfile ? (
            <>
              <Text style={styles.userName}>
                {userProfile.gender === 'male' ? '👨' : '👩'} 
                {userProfile.age}岁 · {userProfile.weight}kg
              </Text>
              <Text style={styles.userDetail}>
                训练年限: {userProfile.trainingYears}年
              </Text>
              <Text style={styles.userDetail}>
                蛋白质摄入: {userProfile.proteinIntake}g/kg/天
              </Text>
              <Text style={styles.userDetail}>
                睡眠: {userProfile.sleepHours}小时
              </Text>
              {userProfile.muscleGainGoal && (
                <Text style={styles.goal}>
                  增肌目标: {userProfile.muscleGainGoal}kg
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.noProfile}>尚未设置身体数据</Text>
          )}
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('BodyData')}
            style={styles.editButton}
          >
            {userProfile ? '编辑身体数据' : '设置身体数据'}
          </Button>
        </Card.Content>
      </Card>

      {/* 统计概览 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练统计</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
              <Text style={styles.statLabel}>完成训练</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{exercises.length}</Text>
              <Text style={styles.statLabel}>动作数量</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 功能列表 */}
      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="动作库管理"
            description="查看和管理训练动作"
            left={props => <List.Icon {...props} icon="dumbbell" />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
          />
          <Divider />
          <List.Item
            title="肌肉增长预测"
            description="基于数据预测增肌效果"
            left={props => <List.Icon {...props} icon="trending-up" />}
            onPress={() => navigation.navigate('Prediction')}
          />
          <Divider />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account" />}
            onPress={() => navigation.navigate('BodyData')}
          />
        </List.Section>
      </Card>
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
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  goal: {
    fontSize: 16,
    color: '#1A5F7A',
    fontWeight: 'bold',
    marginTop: 8,
  },
  noProfile: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  editButton: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
