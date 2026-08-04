import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, List, Divider, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises, workoutPlans } = useAppStore();

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

  const getGenderLabel = (gender?: string) => {
    return gender === 'male' ? '男' : gender === 'female' ? '女' : '';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户信息区域 - 紧凑设计 */}
      <View style={styles.userSection}>
        {userProfile ? (
          <View style={styles.userRow}>
            <Avatar.Icon
              size={56}
              icon={userProfile.gender === 'male' ? 'face-man' : 'face-woman'}
              style={styles.avatar}
              color="#6366F1"
            />
            <View style={styles.userMeta}>
              <Text style={styles.userMainInfo}>
                {getGenderLabel(userProfile.gender)} · {userProfile.age}岁 · {userProfile.weight}kg
              </Text>
              <Text style={styles.userSubInfo}>
                训练 {userProfile.trainingYears} 年 · 睡眠 {userProfile.sleepHours}h · 蛋白 {userProfile.proteinIntake}g/kg
              </Text>
            </View>
            <Button
              mode="text"
              onPress={() => navigation.navigate('BodyData')}
              labelStyle={styles.editText}
              icon="pencil"
              compact
            >
              编辑
            </Button>
          </View>
        ) : (
          <View style={styles.userRow}>
            <Avatar.Icon size={56} icon="account-off" style={styles.avatar} color="#94A3B8" />
            <View style={styles.userMeta}>
              <Text style={styles.userMainInfo}>尚未设置身体数据</Text>
              <Text style={styles.userSubInfo}>设置后可查看预测和建议</Text>
            </View>
            <Button
              mode="text"
              onPress={() => navigation.navigate('BodyData')}
              labelStyle={styles.editText}
              icon="pencil"
              compact
            >
              设置
            </Button>
          </View>
        )}
      </View>

      {/* 统计概览 - 三列紧凑卡片 */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, styles.statCardFirst]}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="dumbbell" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
            <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
            <Text style={styles.statLabel}>完成训练</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="weight-kilogram" style={{ backgroundColor: 'transparent' }} color="#10B981" />
            <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>总容量</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="format-list-bulleted" style={{ backgroundColor: 'transparent' }} color="#F59E0B" />
            <Text style={styles.statNumber}>{exercises.length}</Text>
            <Text style={styles.statLabel}>动作数</Text>
          </Card.Content>
        </Card>
      </View>

      {/* 功能列表 */}
      <Card style={styles.menuCard}>
        <List.Section style={styles.menuSection}>
          <List.Item
            title="动作库管理"
            description="查看和管理训练动作"
            left={props => <List.Icon {...props} icon="dumbbell" color="#6366F1" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.menuDivider} />
          <List.Item
            title="身体预测"
            description="增肌减脂预测与身体重组"
            left={props => <List.Icon {...props} icon="trending-up" color="#10B981" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('Prediction')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.menuDivider} />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account-details" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('BodyData')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
        </List.Section>
      </Card>

      {/* 版本信息 */}
      <Text style={styles.version}>FitTrack v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  userSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#EEF2FF',
  },
  userMeta: {
    flex: 1,
    marginLeft: 12,
  },
  userMainInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  userSubInfo: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  editText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: -4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statCardFirst: {
    marginLeft: 0,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  menuSection: {
    paddingVertical: 4,
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  listDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  menuDivider: {
    marginHorizontal: 16,
    backgroundColor: '#F1F5F9',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 24,
    marginBottom: 32,
  },
});
