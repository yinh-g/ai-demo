import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Text, Card, Button, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { CardioActivity } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const cardioOptions: { type: CardioActivity; label: string; icon: string; color: string }[] = [
  { type: 'running', label: '跑步', icon: 'run', color: '#10B981' },
  { type: 'incline_walk', label: '爬坡', icon: 'terrain', color: '#F59E0B' },
  { type: 'cycling', label: '骑行', icon: 'bike', color: '#3B82F6' },
  { type: 'rowing', label: '划船', icon: 'rowing', color: '#8B5CF6' },
];

export default function TrainingScreen({ navigation }: any) {
  const { currentWorkout, currentCardio, workoutPlans, startCardio } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<'strength' | 'cardio' | null>('strength');

  const toggleSection = (section: 'strength' | 'cardio') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === section ? null : section);
  };

  // ── 进行中：力量 ──
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

  // ── 进行中：有氧 ──
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

  const handleStartPlan = (planId: string) => {
    navigation.navigate('WorkoutSession', { planId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="dumbbell" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>开始训练</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── 力量训练入口 ── */}
        <TouchableOpacity
          style={styles.entryRow}
          onPress={() => toggleSection('strength')}
          activeOpacity={0.7}
        >
          <View style={[styles.entryIconBg, { backgroundColor: '#EEF2FF' }]}>
            <Avatar.Icon size={28} icon="dumbbell" style={styles.entryIcon} color="#6366F1" />
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryTitle}>力量训练</Text>
            <Text style={styles.entrySubtitle}>
              {workoutPlans.length > 0 ? `${workoutPlans.length} 个计划` : '创建计划开始训练'}
            </Text>
          </View>
          <Avatar.Icon
            size={20}
            icon={expandedSection === 'strength' ? 'chevron-up' : 'chevron-right'}
            style={styles.chevron}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {/* ── 力量训练展开内容 ── */}
        {expandedSection === 'strength' && (
          <View style={styles.expandedContent}>
            {workoutPlans.length > 0 ? (
              workoutPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planItem}
                  onPress={() => handleStartPlan(plan.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.planDot, { backgroundColor: '#6366F1' }]} />
                  <View style={styles.planItemInfo}>
                    <Text style={styles.planItemName}>{plan.name}</Text>
                    <Text style={styles.planItemMeta}>{plan.exercises.length} 个动作</Text>
                  </View>
                  <Avatar.Icon size={20} icon="play" style={styles.playIcon} color="#6366F1" />
                </TouchableOpacity>
              ))
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
          </View>
        )}

        {/* ── 有氧训练入口 ── */}
        <TouchableOpacity
          style={[styles.entryRow, { marginTop: 12 }]}
          onPress={() => toggleSection('cardio')}
          activeOpacity={0.7}
        >
          <View style={[styles.entryIconBg, { backgroundColor: '#ECFDF5' }]}>
            <Avatar.Icon size={28} icon="heart-pulse" style={styles.entryIcon} color="#10B981" />
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryTitle}>有氧训练</Text>
            <Text style={styles.entrySubtitle}>跑步 · 骑行 · 划船 · 爬坡</Text>
          </View>
          <Avatar.Icon
            size={20}
            icon={expandedSection === 'cardio' ? 'chevron-up' : 'chevron-right'}
            style={styles.chevron}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {/* ── 有氧训练展开内容 ── */}
        {expandedSection === 'cardio' && (
          <View style={styles.expandedContent}>
            <View style={styles.cardioGrid}>
              {cardioOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.cardioItem, { backgroundColor: option.color + '15' }]}
                  onPress={() => handleStartCardio(option.type)}
                  activeOpacity={0.7}
                >
                  <Avatar.Icon
                    size={32}
                    icon={option.icon}
                    style={[styles.cardioIcon, { backgroundColor: option.color + '25' }]}
                    color={option.color}
                  />
                  <Text style={[styles.cardioLabel, { color: option.color }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingTop: 4,
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
  scrollContent: {
    paddingBottom: 16,
  },
  // ── 入口行 ──
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  entryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryIcon: {
    backgroundColor: 'transparent',
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  entrySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  chevron: {
    backgroundColor: 'transparent',
  },
  // ── 展开内容 ──
  expandedContent: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  // ── 计划列表项 ──
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  planItemInfo: {
    flex: 1,
  },
  planItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  planItemMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  playIcon: {
    backgroundColor: '#EEF2FF',
  },
  // ── 空状态 ──
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
  // ── 有氧网格 ──
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
  // ── 进行中训练 ──
  card: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCard: {
    backgroundColor: '#6366F1',
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
