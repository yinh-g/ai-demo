import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { CardioActivity } from '../types';

const cardioOptions: { type: CardioActivity; label: string; icon: string; color: string }[] = [
  { type: 'running', label: '跑步', icon: 'run', color: '#10B981' },
  { type: 'incline_walk', label: '爬坡', icon: 'terrain', color: '#F59E0B' },
  { type: 'cycling', label: '骑行', icon: 'bike', color: '#3B82F6' },
  { type: 'rowing', label: '划船', icon: 'rowing', color: '#8B5CF6' },
];

export default function TrainingScreen({ navigation }: any) {
  const { currentWorkout, currentCardio, workoutPlans, startCardio } = useAppStore();

  if (currentWorkout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Avatar.Icon size={40} icon="dumbbell" style={styles.headerIcon} color="#6366F1" />
          <Text style={styles.title}>训练</Text>
        </View>
        <Card style={[styles.card, styles.activeCard]}>
          <Card.Content>
            <View style={styles.activeHeader}>
              <Avatar.Icon size={56} icon="run-fast" style={styles.activeIcon} color="#fff" />
              <Text style={styles.activeTitle}>力量训练进行中</Text>
              <Text style={styles.activeText}>你有一个正在进行的力量训练</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('WorkoutSession')}
              style={styles.continueButton}
              labelStyle={styles.continueButtonLabel}
              icon="arrow-right"
            >
              继续训练
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (currentCardio) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Avatar.Icon size={40} icon="heart-pulse" style={styles.headerIcon} color="#6366F1" />
          <Text style={styles.title}>训练</Text>
        </View>
        <Card style={[styles.card, styles.activeCard]}>
          <Card.Content>
            <View style={styles.activeHeader}>
              <Avatar.Icon size={56} icon="run" style={styles.activeIcon} color="#fff" />
              <Text style={styles.activeTitle}>有氧训练进行中</Text>
              <Text style={styles.activeText}>你有一个正在进行的有氧训练</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CardioSession')}
              style={styles.continueButton}
              labelStyle={styles.continueButtonLabel}
              icon="arrow-right"
            >
              继续训练
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const handleStartCardio = (activity: CardioActivity) => {
    startCardio(activity);
    navigation.navigate('CardioSession', { activity });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="dumbbell" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>开始训练</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 力量训练区域 */}
        <Card style={[styles.card, styles.strengthCard]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={28} icon="dumbbell" style={styles.sectionIcon} color="#6366F1" />
              <Text style={styles.sectionTitle}>力量训练</Text>
            </View>
            {workoutPlans.length > 0 ? (
              <>
                <Text style={styles.sectionSubtitle}>选择计划开始训练</Text>
                {workoutPlans.map((plan) => (
                  <Card key={plan.id} style={styles.planCard}>
                    <Card.Content>
                      <View style={styles.planHeader}>
                        <View style={styles.planIconBg}>
                          <Avatar.Icon size={32} icon="clipboard-list" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
                        </View>
                        <View style={styles.planInfo}>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <View style={styles.planMeta}>
                            <Avatar.Icon size={14} icon="dumbbell" style={styles.metaIcon} color="#94A3B8" />
                            <Text style={styles.planDetail}>{plan.exercises.length} 个动作</Text>
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                    <Card.Actions style={styles.cardActions}>
                      <Button
                        mode="contained"
                        onPress={() => navigation.navigate('WorkoutSession', { planId: plan.id })}
                        style={styles.startButton}
                        labelStyle={styles.startButtonLabel}
                        icon="play"
                      >
                        开始训练
                      </Button>
                    </Card.Actions>
                  </Card>
                ))}
              </>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>还没有创建训练计划</Text>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('CreatePlan')}
                  style={styles.createButton}
                  labelStyle={styles.createButtonLabel}
                  icon="plus"
                  textColor="#6366F1"
                >
                  创建计划
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 有氧训练区域 */}
        <Card style={[styles.card, styles.cardioCard]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={28} icon="heart-pulse" style={styles.sectionIcon} color="#10B981" />
              <Text style={styles.sectionTitle}>有氧训练</Text>
            </View>
            <Text style={styles.sectionSubtitle}>快速开始有氧运动</Text>
            <View style={styles.cardioGrid}>
              {cardioOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.cardioItem, { backgroundColor: option.color + '15' }]}
                  onPress={() => handleStartCardio(option.type)}
                >
                  <Avatar.Icon
                    size={40}
                    icon={option.icon}
                    style={[styles.cardioIcon, { backgroundColor: option.color + '25' }]}
                    color={option.color}
                  />
                  <Text style={[styles.cardioLabel, { color: option.color }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  strengthCard: {
    backgroundColor: '#fff',
  },
  cardioCard: {
    backgroundColor: '#fff',
  },
  activeCard: {
    backgroundColor: '#6366F1',
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  planCard: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    backgroundColor: 'transparent',
    marginRight: 2,
  },
  planDetail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  startButton: {
    borderRadius: 10,
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
  },
  startButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 12,
  },
  createButton: {
    borderRadius: 10,
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  createButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardioItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  cardioIcon: {
    marginBottom: 6,
  },
  cardioLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  activeIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  activeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
  },
  continueButtonLabel: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
});
