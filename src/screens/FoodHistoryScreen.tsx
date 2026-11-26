import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Avatar, IconButton, Divider, Button, Chip } from 'react-native-paper';
import { useAppStore } from '../store';
import { theme, cardStyle, pagePadding } from '../theme';
import { FoodLog, MealType } from '../types';
import { getWeightTrend } from '../utils/bodyTrend';
import { macrosOfLog, macroEnergyShare, sumMacros } from '../utils/nutrition';
import {
  activityFactorFromRecords,
  buildNutritionTarget,
  evaluateMacros,
  safeBodyWeight,
  statusColor,
} from '../utils/nutritionTargets';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'weather-sunny',
  lunch: 'white-balance-sunny',
  dinner: 'weather-night',
  snack: 'cookie',
};

// 用本地时区解析 YYYY-MM-DD，避免 new Date('YYYY-MM-DD') 的 UTC 偏移
function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${weekdays[d.getDay()]}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface DayGroup {
  date: string;
  logs: FoodLog[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function FoodHistoryScreen({ navigation }: any) {
  const { foodLogs, deleteFoodLog, getNutritionStats, userProfile, bodyMeasurements, workoutRecords, calibration } = useAppStore();
  const stats = getNutritionStats(7);
  const [expandedDate, setExpandedDate] = useState<string | null>(todayStr());

  // 蛋白 / kg 需要体重：优先用最近体重的 7 日均值，回退到资料里的体重
  const bodyWeight = safeBodyWeight(getWeightTrend(bodyMeasurements), userProfile?.weight);
  const avgProteinPerKg = bodyWeight && bodyWeight > 0 ? round1(stats.avgProtein / bodyWeight) : 0;

  // 每日营养目标（用于标注当天某一餐/整天的营养偏差）
  const dailyTarget = buildNutritionTarget({
    profile: userProfile,
    bodyWeight,
    activityFactor: activityFactorFromRecords(workoutRecords),
    tdeeFactor: calibration?.tdeeFactor,
  });

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, FoodLog[]>();
    foodLogs.forEach((log) => {
      const arr = map.get(log.date) || [];
      arr.push(log);
      map.set(log.date, arr);
    });

    return Array.from(map.entries())
      .map(([date, logs]) => {
        const m = sumMacros(logs);
        return {
          date,
          logs,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [foodLogs]);

  const handleDelete = (log: FoodLog) => {
    Alert.alert(
      '删除记录',
      `确定删除「${MEAL_LABELS[log.mealType]}」的 ${log.items.length} 项食物吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => deleteFoodLog(log.id) },
      ]
    );
  };

  if (foodLogs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Avatar.Icon size={72} icon="food-apple-outline" style={styles.emptyIcon} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>还没有饮食记录</Text>
        <Text style={styles.emptyHint}>拍照识别一餐，热量数据会自动留存并同步</Text>
        <Button
          mode="contained"
          icon="camera"
          onPress={() => navigation.navigate('FoodScan')}
          style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.emptyButtonLabel}
        >
          去拍照记录
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[pagePadding, { paddingTop: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 近 7 天汇总 */}
      <Card style={[styles.card, styles.summaryCard]}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>近 7 天饮食</Text>
            <Text style={styles.summaryDays}>{stats.days} 天有记录</Text>
          </View>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryCalories}>{stats.avgCalories}</Text>
            <Text style={styles.summaryUnit}>kcal / 天（日均）</Text>
          </View>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{round1(stats.avgProtein)}g</Text>
              <Text style={styles.macroLabel}>蛋白</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{round1(stats.avgCarbs)}g</Text>
              <Text style={styles.macroLabel}>碳水</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{round1(stats.avgFat)}g</Text>
              <Text style={styles.macroLabel}>脂肪</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{avgProteinPerKg}</Text>
              <Text style={styles.macroLabel}>蛋白(g/kg)</Text>
            </View>
          </View>
          <Text style={styles.summaryFoot}>
            {bodyWeight
              ? `按体重 ${round1(bodyWeight)}kg 计算 · 展开下方每天可看当日与每餐明细`
              : '填写体重后可计算每天每公斤蛋白摄入'}
          </Text>
        </Card.Content>
      </Card>

      {/* 按日列表 */}
      {groups.map((group) => {
        const isOpen = expandedDate === group.date;
        const isToday = group.date === todayStr();
        const share = macroEnergyShare(group);
        const dayProteinPerKg =
          bodyWeight && bodyWeight > 0 ? round1(group.protein / bodyWeight) : undefined;
        const issue = dailyTarget
          ? evaluateMacros(group, dailyTarget).find((c) => c.status !== 'ok')
          : undefined;
        return (
          <Card key={group.date} style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedDate(isOpen ? null : group.date)}
            >
              <Card.Content style={styles.dayHeader}>
                <View style={styles.dayLeft}>
                  <View style={styles.dayDateRow}>
                    <Text style={styles.dayDate}>{formatDate(group.date)}</Text>
                    {isToday && (
                      <Chip compact style={styles.todayChip} textStyle={styles.todayChipText}>今天</Chip>
                    )}
                  </View>
                  <Text style={styles.dayMeta}>
                    {group.logs.length} 餐 · {Math.round(group.calories)} kcal
                    {dayProteinPerKg !== undefined ? ` · 蛋白 ${dayProteinPerKg}g/kg` : ''}
                  </Text>
                  <Text style={styles.dayMacros}>
                    蛋白 {round1(group.protein)}g · 碳水 {round1(group.carbs)}g · 脂肪 {round1(group.fat)}g
                  </Text>
                  {issue && (
                    <Text style={[styles.dayIssue, { color: statusColor(issue.status) }]}>
                      {issue.label}
                      {issue.status === 'high' ? '偏高' : '偏低'} · 目标 {issue.target}
                      {issue.unit}
                    </Text>
                  )}
                </View>
                <IconButton
                  icon={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  iconColor={theme.colors.textTertiary}
                  style={{ margin: 0 }}
                />
              </Card.Content>
            </TouchableOpacity>

            {isOpen && (
              <Card.Content style={styles.dayBody}>
                <Divider style={styles.divider} />
                <Text style={styles.dayEnergy}>
                  供能占比：蛋白 {share.protein}% · 碳水 {share.carbs}% · 脂肪 {share.fat}%
                </Text>
                {group.logs.map((log) => {
                  const meal = macrosOfLog(log);
                  return (
                    <View key={log.id} style={styles.mealBlock}>
                      <View style={styles.mealHeader}>
                        <Avatar.Icon
                          size={22}
                          icon={MEAL_ICONS[log.mealType]}
                          style={{ backgroundColor: theme.colors.primaryLight }}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.mealName}>{MEAL_LABELS[log.mealType]}</Text>
                        <Text style={styles.mealCalories}>{Math.round(meal.calories)} kcal</Text>
                        <IconButton
                          icon="trash-can-outline"
                          size={18}
                          iconColor={theme.colors.textTertiary}
                          onPress={() => handleDelete(log)}
                          style={{ margin: 0 }}
                        />
                      </View>
                      <View style={styles.mealMacroRow}>
                        <Text style={styles.mealMacro}>蛋白 {round1(meal.protein)}g</Text>
                        <Text style={styles.mealMacro}>碳水 {round1(meal.carbs)}g</Text>
                        <Text style={styles.mealMacro}>脂肪 {round1(meal.fat)}g</Text>
                      </View>
                      <View style={styles.foodList}>
                        {log.items.map((item, index) => (
                          <View key={`${log.id}-${index}`} style={styles.foodRow}>
                            <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.foodMeta}>
                              {item.amount}{item.unit} · {item.calories} kcal
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </Card.Content>
            )}
          </Card>
        );
      })}

      <Button
        mode="outlined"
        icon="camera"
        onPress={() => navigation.navigate('FoodScan')}
        style={styles.addButton}
        textColor={theme.colors.primary}
        labelStyle={styles.addButtonLabel}
      >
        记录新的一餐
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    ...cardStyle,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryDays: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  summaryCalories: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginLeft: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  macroLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryFoot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dayLeft: {
    flex: 1,
  },
  dayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  todayChip: {
    backgroundColor: theme.colors.primaryLight,
    height: 20,
  },
  todayChipText: {
    fontSize: 10,
    color: theme.colors.primary,
    marginVertical: 0,
  },
  dayMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  dayMacros: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  dayIssue: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  dayBody: {
    paddingTop: 0,
  },
  divider: {
    backgroundColor: theme.colors.border,
    marginBottom: 8,
  },
  dayEnergy: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginBottom: 8,
  },
  mealBlock: {
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  mealMacroRow: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 28,
    marginTop: 2,
  },
  mealMacro: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  foodList: {
    marginLeft: 28,
    marginTop: 2,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 8,
  },
  foodName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  foodMeta: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  addButton: {
    marginVertical: 16,
    borderRadius: 12,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    paddingVertical: 4,
  },
  addButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  emptyButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
