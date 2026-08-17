import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { CardioActivity } from '../types';
import { theme, cardStyle, cardSpacing, pagePadding } from '../theme';

const cardioOptions: { type: CardioActivity; label: string; icon: string; color: string; sub: string }[] = [
  { type: 'running', label: '跑步', icon: 'run', color: theme.colors.success, sub: '燃脂 · 心肺' },
  { type: 'incline_walk', label: '爬坡', icon: 'terrain', color: theme.colors.warning, sub: '臀腿 · 耐力' },
  { type: 'cycling', label: '骑行', icon: 'bike', color: '#3B82F6', sub: '下肢 · 有氧' },
  { type: 'rowing', label: '划船', icon: 'rowing', color: '#8B5CF6', sub: '全身 · 核心' },
];

export default function TrainingScreen({ navigation }: any) {
  const { currentWorkout, currentCardio, workoutPlans, startCardio } = useAppStore();

  // ── 进行中：力量 ──
  if (currentWorkout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Avatar.Icon size={40} icon="dumbbell" style={styles.headerIcon} color={theme.colors.primary} />
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
          <Avatar.Icon size={40} icon="heart-pulse" style={styles.headerIcon} color={theme.colors.primary} />
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

  // 选择第一个计划快速开始（如果没有计划则跳转创建）
  const handleQuickStartStrength = () => {
    if (workoutPlans.length > 0) {
      navigation.navigate('WorkoutSession', { planId: workoutPlans[0].id });
    } else {
      navigation.navigate('CreatePlan');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="dumbbell" style={styles.headerIcon} color={theme.colors.primary} />
        <Text style={styles.title}>开始训练</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 力量训练 — 大 CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, styles.ctaStrength]}
          onPress={handleQuickStartStrength}
          activeOpacity={0.85}
        >
          <Avatar.Icon size={40} icon="dumbbell" style={styles.ctaIcon} color="#fff" />
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>力量训练</Text>
            <Text style={styles.ctaSub}>
              {workoutPlans.length > 0
                ? `从「${workoutPlans[0].name}」开始`
                : '创建计划后开始训练'}
            </Text>
          </View>
          <Avatar.Icon size={24} icon="chevron-right" style={styles.ctaChevron} color="#fff" />
        </TouchableOpacity>

        {/* 计划管理入口 */}
        {workoutPlans.length > 0 && (
          <TouchableOpacity
            style={styles.planEntry}
            onPress={() => navigation.navigate('Plans')}
            activeOpacity={0.7}
          >
            <Avatar.Icon size={20} icon="clipboard-list" style={styles.planEntryIcon} color={theme.colors.primary} />
            <Text style={styles.planEntryText}>
              管理训练计划 ({workoutPlans.length})
            </Text>
            <Avatar.Icon size={18} icon="chevron-right" style={styles.planEntryChevron} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* 有氧训练 — 类型选择 */}
        <Text style={styles.sectionLabel}>有氧训练</Text>
        <View style={styles.cardioGrid}>
          {cardioOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[styles.cardioCard, { backgroundColor: option.color + '12' }]}
              onPress={() => handleStartCardio(option.type)}
              activeOpacity={0.75}
            >
              <View style={[styles.cardioIconWrap, { backgroundColor: option.color + '25' }]}>
                <Avatar.Icon size={28} icon={option.icon} style={{ backgroundColor: 'transparent' }} color={option.color} />
              </View>
              <Text style={[styles.cardioLabel, { color: option.color }]}>{option.label}</Text>
              <Text style={styles.cardioSub}>{option.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  headerIcon: {
    backgroundColor: theme.colors.primaryLight,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollContent: { ...pagePadding },

  // ── 力量 CTA ──
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaStrength: {
    backgroundColor: theme.colors.primary,
  },
  ctaIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 14,
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  ctaSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  ctaChevron: {
    backgroundColor: 'transparent',
    opacity: 0.7,
  },

  // ── 计划管理入口 ──
  planEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    ...cardStyle,
    elevation: 1,
  },
  planEntryIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  planEntryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  planEntryChevron: {
    backgroundColor: 'transparent',
  },

  // ── 有氧类型 ──
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  cardioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardioCard: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardioIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardioSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // ── 进行中训练 ──
  card: { ...cardStyle, marginBottom: cardSpacing.marginBottom },
  activeCard: {
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
