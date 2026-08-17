import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar, TextInput, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store';
import { theme, cardStyle, pagePadding } from '../theme';

const STEP_GOAL = 10000;

export default function HomeScreen({ navigation }: any) {
  const { userProfile, workoutRecords, dailyActivities, setDailyActivity, getTodayActivity } = useAppStore();
  const todayActivity = getTodayActivity();

  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityInput, setActivityInput] = useState({ steps: '', calories: '', distance: '' });
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let subscription: any;
    let isMounted = true;

    const subscribe = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!isMounted) return;
        setIsPedometerAvailable(available);

        if (available) {
          const now = new Date();
          const today = now.toISOString().split('T')[0];

          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const result = await Pedometer.getStepCountAsync(startOfDay, now);

          if (result && isMounted) {
            const estimatedCalories = Math.round(result.steps * 0.04);
            const estimatedDistance = parseFloat((result.steps * 0.0007).toFixed(1));
            setDailyActivity({
              date: today,
              steps: result.steps,
              activeCalories: estimatedCalories,
              distanceKm: estimatedDistance,
              source: 'health_connect',
              updatedAt: Date.now(),
            });
          }

          await AsyncStorage.setItem('lastAppOpenTime', now.toISOString());

          subscription = Pedometer.watchStepCount(result => {
            if (!isMounted) return;
            const today = new Date().toISOString().split('T')[0];
            const estimatedCalories = Math.round(result.steps * 0.04);
            const estimatedDistance = parseFloat((result.steps * 0.0007).toFixed(1));
            setDailyActivity({
              date: today,
              steps: result.steps,
              activeCalories: estimatedCalories,
              distanceKm: estimatedDistance,
              source: 'health_connect',
              updatedAt: Date.now(),
            });
          });
        }
      } catch (error) {
        console.error('Pedometer error:', error);
        if (isMounted) setIsPedometerAvailable(false);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const handleSaveActivity = () => {
    const steps = parseInt(activityInput.steps) || 0;
    const calories = parseInt(activityInput.calories) || 0;
    const distance = parseFloat(activityInput.distance) || 0;

    if (steps <= 0 && calories <= 0) {
      Alert.alert('提示', '请至少输入步数或消耗卡路里');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setDailyActivity({
      date: today,
      steps,
      activeCalories: calories,
      distanceKm: distance,
      source: 'manual',
      updatedAt: Date.now(),
    });
    setShowActivityDialog(false);
    setActivityInput({ steps: '', calories: '', distance: '' });
  };

  const recentRecords = workoutRecords.filter(r => r.status === 'completed').slice(-3).reverse();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return '夜深了，';
    if (h < 12) return '早上好，';
    if (h < 14) return '中午好，';
    if (h < 18) return '下午好，';
    return '晚上好，';
  };

  const getDateStr = () => {
    const d = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 · ${weekdays[d.getDay()]}`;
  };

  const steps = todayActivity?.steps || 0;
  const stepProgress = Math.min(steps / STEP_GOAL, 1);
  const calories = todayActivity?.activeCalories || 0;
  const distance = todayActivity?.distanceKm || 0;

  const userName = userProfile?.nickname || '训练者';

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={[styles.scrollView, pagePadding]} showsVerticalScrollIndicator={false}>
        {/* Header: 问候 + 日期 */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, isSmallScreen && styles.greetingSmall]}>
              {getGreeting()}{userName}
            </Text>
            <Text style={styles.dateStr}>{getDateStr()}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setShowActivityDialog(true)}
            activeOpacity={0.7}
          >
            <Avatar.Icon size={32} icon="plus" style={styles.headerActionIcon} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* 今日进度卡 */}
        <Card style={styles.todayCard}>
          <Card.Content style={styles.todayCardContent}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>今日进度</Text>
              <View style={styles.todayHeaderRight}>
                {isPedometerAvailable && (
                  <View style={styles.syncBadge}>
                    <Avatar.Icon size={12} icon="sync" style={{ backgroundColor: 'transparent' }} color="#fff" />
                    <Text style={styles.syncBadgeText}>自动</Text>
                  </View>
                )}
              </View>
            </View>

            {todayActivity ? (
              <>
                {/* 步数进度条 */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressSteps}>
                      {steps.toLocaleString()}
                      <Text style={styles.progressUnit}> 步</Text>
                    </Text>
                    <Text style={styles.progressGoal}>
                      目标 {STEP_GOAL.toLocaleString()} 步
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${stepProgress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressPct}>
                    完成 {(stepProgress * 100).toFixed(0)}%
                    {stepProgress >= 1 && ' 🎉'}
                  </Text>
                </View>

                {/* 卡路里 + 距离 */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Avatar.Icon size={20} icon="fire" style={{ backgroundColor: 'transparent' }} color="#fff" />
                    </View>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {calories}
                    </Text>
                    <Text style={styles.statLabel}>消耗 kcal</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Avatar.Icon size={20} icon="map-marker-distance" style={{ backgroundColor: 'transparent' }} color="#fff" />
                    </View>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {distance.toFixed(1)}
                    </Text>
                    <Text style={styles.statLabel}>公里</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyToday}>
                <Text style={styles.emptyTodayText}>
                  {isPedometerAvailable
                    ? '正在同步步数数据...'
                    : '记录今日活动，追踪你的进度'}
                </Text>
                {!isPedometerAvailable && (
                  <Button
                    mode="text"
                    onPress={() => setShowActivityDialog(true)}
                    labelStyle={{ fontSize: 14, color: '#fff', fontWeight: '600' }}
                    icon="plus"
                    compact
                  >
                    手动记录
                  </Button>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* 开始训练 — CTA 区域 */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>开始训练</Text>
          <View style={styles.ctaButtons}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaButtonStrength]}
              onPress={() => navigation.jumpTo('Training')}
              activeOpacity={0.85}
            >
              <Avatar.Icon size={36} icon="dumbbell" style={styles.ctaIcon} color="#fff" />
              <View style={styles.ctaTextWrap}>
                <Text style={styles.ctaButtonTitle}>力量训练</Text>
                <Text style={styles.ctaButtonSub}>增肌 · 塑形</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaButtonCardio]}
              onPress={() => navigation.jumpTo('Training')}
              activeOpacity={0.85}
            >
              <Avatar.Icon size={36} icon="run" style={styles.ctaIcon} color="#fff" />
              <View style={styles.ctaTextWrap}>
                <Text style={styles.ctaButtonTitle}>有氧训练</Text>
                <Text style={styles.ctaButtonSub}>燃脂 · 心肺</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近训练 */}
        {recentRecords.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>最近训练</Text>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Stats')}
                  labelStyle={{ fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}
                  compact
                >
                  查看全部
                </Button>
              </View>

              {recentRecords.map((record, index) => (
                <View key={record?.id || index}>
                  <TouchableOpacity
                    style={styles.recordRow}
                    onPress={() => record?.id && navigation.navigate('WorkoutRecordDetail', { recordId: record.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.recordIcon, {
                      backgroundColor: record?.workoutType === 'cardio' ? theme.colors.success + '20' : theme.colors.primaryLight
                    }]}>
                      <Avatar.Icon
                        size={24}
                        icon={record?.workoutType === 'cardio' ? 'run' : 'dumbbell'}
                        style={{ backgroundColor: 'transparent' }}
                        color={record?.workoutType === 'cardio' ? theme.colors.success : theme.colors.primary}
                      />
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordType}>
                        {record?.workoutType === 'cardio' ? '有氧' : '力量'}训练
                      </Text>
                      <Text style={styles.recordDate}>{record?.date}</Text>
                    </View>
                    <View style={styles.recordMeta}>
                      <Text style={styles.recordDuration}>{record?.duration || 0}分钟</Text>
                      {record?.totalVolume > 0 && (
                        <Text style={styles.recordVolume}>{(record?.totalVolume || 0).toLocaleString()} kg</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {index < recentRecords.length - 1 && <View style={styles.recordDivider} />}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* 活动数据弹窗 */}
        <Portal>
          <Dialog visible={showActivityDialog} onDismiss={() => setShowActivityDialog(false)} style={styles.dialog}>
            <Dialog.Title style={styles.dialogTitle}>记录今日活动</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="步数"
                value={activityInput.steps}
                onChangeText={text => setActivityInput({ ...activityInput, steps: text })}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="walk" color={theme.colors.textTertiary} />}
              />
              <TextInput
                label="活跃消耗 (kcal)"
                value={activityInput.calories}
                onChangeText={text => setActivityInput({ ...activityInput, calories: text })}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="fire" color={theme.colors.textTertiary} />}
              />
              <TextInput
                label="距离 (km)"
                value={activityInput.distance}
                onChangeText={text => setActivityInput({ ...activityInput, distance: text })}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="map-marker-distance" color={theme.colors.textTertiary} />}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowActivityDialog(false)} textColor={theme.colors.textSecondary}>取消</Button>
              <Button onPress={handleSaveActivity} mode="contained" style={{ borderRadius: 8, backgroundColor: theme.colors.primary }}>保存</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  greetingSmall: {
    fontSize: 18,
  },
  dateStr: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionIcon: {
    backgroundColor: 'transparent',
  },

  // ── 今日进度卡 ──
  todayCard: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  todayCardContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  todayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  syncBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressSteps: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressUnit: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  progressGoal: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  emptyToday: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyTodayText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },

  // ── CTA 区域 ──
  ctaSection: {
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonStrength: {
    backgroundColor: theme.colors.primary,
  },
  ctaButtonCardio: {
    backgroundColor: theme.colors.success,
  },
  ctaIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ctaButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // ── 最近训练 ──
  card: {
    ...cardStyle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordType: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recordDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recordMeta: {
    alignItems: 'flex-end',
  },
  recordDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  recordVolume: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recordDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 56,
  },

  // ── 弹窗 ──
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});
