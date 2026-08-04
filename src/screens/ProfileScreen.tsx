import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, List, Divider, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises, workoutPlans } = useAppStore();

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="account" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>我的</Text>
      </View>

      {/* 用户信息卡片 */}
      <Card style={[styles.card, styles.userCard]}>
        <Card.Content>
          {userProfile ? (
            <>
              <View style={styles.userHeader}>
                <Avatar.Icon 
                  size={64} 
                  icon={userProfile.gender === 'male' ? 'face-man' : 'face-woman'} 
                  style={styles.avatar}
                  color="#fff"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {userProfile.age}岁 · {userProfile.weight}kg
                  </Text>
                  <Text style={styles.userSubtitle}>
                    训练年限: {userProfile.trainingYears}年
                  </Text>
                </View>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>蛋白质</Text>
                  <Text style={styles.detailValue}>{userProfile.proteinIntake}g/kg</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>睡眠</Text>
                  <Text style={styles.detailValue}>{userProfile.sleepHours}小时</Text>
                </View>
                {userProfile.muscleGainGoal && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>目标</Text>
                    <Text style={styles.detailValue}>{userProfile.muscleGainGoal}kg</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noProfile}>
              <Avatar.Icon size={64} icon="account-off" style={styles.avatar} color="#fff" />
              <Text style={styles.noProfileText}>尚未设置身体数据</Text>
            </View>
          )}
          <Button
            mode="contained"
            onPress={() => navigation.navigate('BodyData')}
            style={styles.editButton}
            labelStyle={styles.editButtonLabel}
            icon="pencil"
          >
            {userProfile ? '编辑身体数据' : '设置身体数据'}
          </Button>
        </Card.Content>
      </Card>

      {/* 统计概览 */}
      <Card style={[styles.card, styles.statsCard]}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练统计</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, styles.statItemBorder]}>
              <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
              <Text style={styles.statLabel}>完成训练</Text>
            </View>
            <View style={[styles.statItem, styles.statItemBorder]}>
              <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.statItem}>
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
            left={props => <List.Icon {...props} icon="dumbbell" color="#6366F1" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="身体预测"
            description="增肌减脂预测与身体重组"
            left={props => <List.Icon {...props} icon="trending-up" color="#10B981" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Prediction')}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account-details" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('BodyData')}
            style={styles.listItem}
          />
        </List.Section>
      </Card>


    </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    backgroundColor: '#fff',
  },
  userCard: {
    backgroundColor: '#6366F1',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  noProfile: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProfileText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  editButtonLabel: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  listItem: {
    paddingVertical: 8,
  },
});
