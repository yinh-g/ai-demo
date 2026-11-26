import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Card, Button, Avatar, Divider, TouchableRipple, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../store';
import { rangeLabels, Range } from './StatsDetailScreen';
import { theme, cardStyle, cardSpacing, pagePadding } from '../theme';
import { getWeightTrend } from '../utils/bodyTrend';
import { buildDailyNutrition } from '../utils/nutrition';
import {
  activityFactorFromRecords,
  buildNutritionTarget,
  evaluateMacros,
  safeBodyWeight,
  statusColor,
} from '../utils/nutritionTargets';

// range 起始时间戳（与 StatsDetailScreen 的 getRangeStart 保持一致）
function rangeStartMs(range: Range): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6); return d.getTime();
  }
  if (range === 'month') {
    const d = new Date(today); d.setDate(d.getDate() - 29); return d.getTime();
  }
  return new Date(today.getFullYear(), today.getMonth() - 11, 1).getTime();
}

type NutritionMetric = 'calories' | 'protein' | 'carbs' | 'fat' | 'proteinPerKg';

export default function StatsScreen({ navigation }: any) {
  const { workoutRecords, exercises, dailyActivities, foodLogs, userProfile, getNutritionStats, bodyMeasurements, calibration } = useAppStore();
  const [range, setRange] = useState<Range>('week');
  const [nutritionMetric, setNutritionMetric] = useState<NutritionMetric>('calories');
  const rStart = rangeStartMs(range);
  const { width: screenWidth } = useWindowDimensions();

  // 按 range 过滤
  const rangeRecords = workoutRecords.filter(r => r.status === 'completed' && new Date(r.date).getTime() >= rStart);
  const rangeVolume = rangeRecords.reduce((sum, r) => sum + r.totalVolume, 0);
  const rangeDuration = rangeRecords.reduce((sum, r) => sum + r.duration, 0);

  const strengthRecords = workoutRecords.filter(r => r.workoutType === 'strength' && r.status === 'completed');
  const cardioRecords = workoutRecords.filter(r => r.workoutType === 'cardio' && r.status === 'completed');

  const totalCardioDistance = cardioRecords.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
  const totalCardioCalories = cardioRecords.reduce((sum, r) => sum + (r.totalCalories || 0), 0);
  const totalCardioDuration = cardioRecords.reduce((sum, r) => sum + r.duration, 0);

  const rangeCardioRecords = rangeRecords.filter(r => r.workoutType === 'cardio');
  const rangeCardioDistance = rangeCardioRecords.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
  const rangeCardioCalories = rangeCardioRecords.reduce((sum, r) => sum + (r.totalCalories || 0), 0);

  const muscleDistribution = () => {
    const distribution: Record<string, number> = {};
    rangeRecords.forEach(record => {
      record.exercises.forEach(exercise => {
        const ex = exercises.find(e => e.id === exercise.exerciseId);
        if (ex) {
          distribution[ex.category] = (distribution[ex.category] || 0) + (exercise.sets?.length || 0);
        }
      });
    });
    return distribution;
  };

  const categoryLabels: Record<string, string> = {
    chest: '胸部',
    back: '背部',
    legs: '腿部',
    shoulders: '肩部',
    arms: '手臂',
    core: '核心',
    cardio: '有氧'
  };

  const categoryIcons: Record<string, string> = {
    chest: 'heart',
    back: 'arrow-left-right',
    legs: 'walk',
    shoulders: 'human',
    arms: 'arm-flex',
    core: 'circle-slice-4',
    cardio: 'run'
  };

  const categoryColors: Record<string, string> = {
    chest: theme.colors.danger,
    back: '#3B82F6',
    legs: '#8B5CF6',
    shoulders: theme.colors.warning,
    arms: theme.colors.success,
    core: '#EC4899',
    cardio: '#06B6D4'
  };

  const muscleDist = muscleDistribution();
  const totalSets = Object.values(muscleDist).reduce((a, b) => a + b, 0);

  // 按 range 过滤活动数据
  const rangeActivities = dailyActivities.filter(a => new Date(a.date).getTime() >= rStart);
  const totalSteps = rangeActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalActivityCalories = rangeActivities.reduce((sum, a) => sum + a.activeCalories, 0);
  const totalDistance = rangeActivities.reduce((sum, a) => sum + a.distanceKm, 0);
  const avgSteps = rangeActivities.length > 0 ? Math.round(totalSteps / rangeActivities.length) : 0;

  // ── 饮食营养（按天）──
  const bodyWeight = safeBodyWeight(getWeightTrend(bodyMeasurements), userProfile?.weight);
  const nutritionDays = range === 'week' ? 7 : 30;

  const dailyNutrition = useMemo(
    () => buildDailyNutrition({ logs: foodLogs, days: nutritionDays, bodyWeight }),
    [foodLogs, nutritionDays, bodyWeight]
  );
  const nutritionStats = useMemo(() => getNutritionStats(nutritionDays), [foodLogs, nutritionDays]);
  const hasFoodData = dailyNutrition.some((d) => d.mealCount > 0);
  const avgProteinPerKg =
    bodyWeight && bodyWeight > 0 ? Math.round((nutritionStats.avgProtein / bodyWeight) * 10) / 10 : 0;

  const metricValues = dailyNutrition.map((d) =>
    nutritionMetric === 'proteinPerKg' ? d.proteinPerKg ?? 0 : d[nutritionMetric]
  );
  const metricLabels = dailyNutrition.map((d, i) =>
    nutritionDays <= 7 || i % 5 === 0 ? d.label : ''
  );

  // 营养目标：目标类型（减脂/增肌/重组）+ 体重 + TDEE 推导，再对日均摄入做高低校验
  const nutritionTarget = useMemo(
    () =>
      buildNutritionTarget({
        profile: userProfile,
        bodyWeight,
        activityFactor: activityFactorFromRecords(workoutRecords),
        tdeeFactor: calibration?.tdeeFactor,
      }),
    [userProfile, bodyWeight, workoutRecords, calibration]
  );

  const macroChecks = useMemo(
    () =>
      nutritionTarget
        ? evaluateMacros(
            {
              calories: nutritionStats.avgCalories,
              protein: nutritionStats.avgProtein,
              carbs: nutritionStats.avgCarbs,
              fat: nutritionStats.avgFat,
            },
            nutritionTarget
          )
        : [],
    [nutritionTarget, nutritionStats]
  );

  const chartWidth = Math.max(240, screenWidth - 64);
  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366F1' },
    propsForBackgroundLines: { stroke: '#F1F5F9' },
  };

  return (
    <ScrollView style={[styles.container, pagePadding]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="chart-bar" style={styles.headerIcon} color={theme.colors.primary} />
        <Text style={styles.title}>数据统计</Text>
      </View>

      <View style={styles.segmentContainer}>
        {(['week', 'month', 'year'] as Range[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.segmentItem, range === r && styles.segmentItemActive]}
            onPress={() => setRange(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>
              {rangeLabels[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={[styles.card, styles.overviewCard]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: '#fff' }]}>{rangeLabels[range]}训练概览</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Avatar.Icon size={28} icon="dumbbell" style={{ backgroundColor: 'transparent' }} color="#fff" />
              </View>
              <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {rangeRecords.length}
              </Text>
              <Text style={styles.statLabel}>训练次数</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Avatar.Icon size={28} icon="weight-kilogram" style={{ backgroundColor: 'transparent' }} color="#fff" />
              </View>
              <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {(rangeVolume / 1000).toFixed(1)}k
              </Text>
              <Text style={styles.statLabel}>总容量</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Avatar.Icon size={28} icon="clock-outline" style={{ backgroundColor: 'transparent' }} color="#fff" />
              </View>
              <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {Math.floor(rangeDuration / 60)}
              </Text>
              <Text style={styles.statLabel}>总时长(时)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 活动统计 */}
      <Card style={styles.card}>
        <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'activity', range })} borderless>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="walk" style={styles.sectionIcon} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{rangeLabels[range]}活动</Text>
              <View style={styles.chevronWrap}>
                <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color={theme.colors.textTertiary} />
                <Text style={styles.tapHint}>查看趋势图</Text>
              </View>
            </View>
            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {totalSteps.toLocaleString()}
                </Text>
                <Text style={styles.weekLabel}>总步数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {avgSteps.toLocaleString()}
                </Text>
                <Text style={styles.weekLabel}>日均步数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {totalActivityCalories}
                </Text>
                <Text style={styles.weekLabel}>消耗</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {totalDistance.toFixed(1)}
                </Text>
                <Text style={styles.weekLabel}>距离(km)</Text>
              </View>
            </View>
          </Card.Content>
        </TouchableRipple>
      </Card>

      {/* 饮食营养：按天查看三大营养与每公斤蛋白 */}
      {hasFoodData && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="food-apple" style={styles.sectionIcon} color={theme.colors.warning} />
              <Text style={styles.sectionTitle}>饮食营养（按天）</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('FoodHistory')}
                activeOpacity={0.7}
                style={styles.chevronWrap}
              >
                <Text style={styles.tapHint}>查看记录</Text>
                <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {nutritionStats.avgCalories}
                </Text>
                <Text style={styles.weekLabel}>日均(kcal)</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {nutritionStats.days}
                </Text>
                <Text style={styles.weekLabel}>记录天数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {avgProteinPerKg}
                </Text>
                <Text style={styles.weekLabel}>日均蛋白(g/kg)</Text>
              </View>
            </View>

            {nutritionTarget && (
              <View style={styles.targetBox}>
                <View style={styles.targetHead}>
                  <Text style={styles.targetTitle}>营养目标 · {nutritionTarget.goalLabel}</Text>
                  <Text style={styles.targetSub}>{nutritionTarget.weight}kg</Text>
                </View>
                <Text style={styles.targetDetail}>
                  {nutritionTarget.calories} kcal · 蛋白 {nutritionTarget.protein}g（
                  {nutritionTarget.proteinPerKg}g/kg）
                </Text>

                {macroChecks.map((c) => (
                  <View key={c.key} style={styles.checkRow}>
                    <Text style={styles.checkLabel}>{c.label}</Text>
                    <View style={styles.checkBarTrack}>
                      <View
                        style={[
                          styles.checkBarFill,
                          {
                            width: `${Math.min(1, c.ratio) * 100}%`,
                            backgroundColor: statusColor(c.status),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.checkValue, { color: statusColor(c.status) }]}>
                      {c.actual}/{c.target} {c.unit}
                    </Text>
                  </View>
                ))}

                <View style={styles.adviceWrap}>
                  {macroChecks.every((c) => c.status === 'ok') ? (
                    <Text style={[styles.adviceText, { color: theme.colors.success }]}>
                      · 三大营养都在目标区间内，保持住
                    </Text>
                  ) : (
                    macroChecks
                      .filter((c) => c.status !== 'ok')
                      .slice(0, 3)
                      .map((c) => (
                        <Text
                          key={c.key}
                          style={[styles.adviceText, { color: statusColor(c.status) }]}
                        >
                          · {c.message}
                        </Text>
                      ))
                  )}
                </View>

                <Text style={styles.targetFoot}>
                  估算 TDEE {nutritionTarget.tdee} kcal · BMR {nutritionTarget.bmr} · 按体重{' '}
                  {nutritionTarget.weight}kg 与日均摄入校验
                </Text>
              </View>
            )}

            {!nutritionTarget && userProfile && (
              <Text style={styles.targetWarn}>
                体重数据异常（当前 {userProfile.weight}kg），无法计算营养目标，请到「身体数据」检查
              </Text>
            )}

            <SegmentedButtons
              value={nutritionMetric}
              onValueChange={(v) => setNutritionMetric(v as NutritionMetric)}
              density="small"
              buttons={[
                { value: 'calories', label: '热量' },
                { value: 'protein', label: '蛋白' },
                { value: 'carbs', label: '碳水' },
                { value: 'fat', label: '脂肪' },
                { value: 'proteinPerKg', label: '蛋白/kg' },
              ]}
              style={styles.metricSwitch}
            />

            <LineChart
              data={{ labels: metricLabels, datasets: [{ data: metricValues }] }}
              width={chartWidth}
              height={180}
              chartConfig={
                nutritionMetric === 'proteinPerKg'
                  ? { ...chartConfig, decimalPlaces: 1 }
                  : chartConfig
              }
              bezier
              fromZero
              withShadow={false}
              withInnerLines
              withOuterLines={false}
              style={styles.chart}
            />

            <Text style={styles.dailyTitle}>
              每日明细 · 近 {nutritionDays} 天
              {!bodyWeight ? '（填写体重后可看蛋白/kg）' : ''}
            </Text>

            {dailyNutrition
              .filter((d) => d.mealCount > 0)
              .slice()
              .reverse()
              .map((d) => {
                const issue = nutritionTarget
                  ? evaluateMacros(d, nutritionTarget).find((c) => c.status !== 'ok')
                  : undefined;
                return (
                  <View key={d.date}>
                    <View style={styles.dailyRow}>
                      <View style={styles.dailyLeft}>
                        <Text style={styles.dailyDate}>
                          {d.label} {d.weekday}
                        </Text>
                        <Text style={styles.dailyMacros}>
                          蛋白 {d.protein}g · 碳水 {d.carbs}g · 脂肪 {d.fat}g
                        </Text>
                      </View>
                      <View style={styles.dailyRight}>
                        {issue && (
                          <Text style={[styles.dailyIssue, { color: statusColor(issue.status) }]}>
                            {issue.label}
                            {issue.status === 'high' ? '偏高' : '偏低'}
                          </Text>
                        )}
                        <Text style={styles.dailyValue}>{d.calories} kcal</Text>
                        {d.proteinPerKg !== undefined && (
                          <Text style={styles.dailyKg}>{d.proteinPerKg} g/kg</Text>
                        )}
                      </View>
                    </View>
                    <Divider style={styles.dailyDivider} />
                  </View>
                );
              })}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'stats', range })} borderless>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="calendar-week" style={styles.sectionIcon} color={theme.colors.success} />
              <Text style={styles.sectionTitle}>{rangeLabels[range]}统计</Text>
              <View style={styles.chevronWrap}>
                <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color={theme.colors.textTertiary} />
                <Text style={styles.tapHint}>查看柱状图</Text>
              </View>
            </View>
            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {rangeRecords.length}
                </Text>
                <Text style={styles.weekLabel}>训练次数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {(rangeVolume / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.weekLabel}>总容量</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {rangeDuration}
                </Text>
                <Text style={styles.weekLabel}>时长(分)</Text>
              </View>
            </View>
          </Card.Content>
        </TouchableRipple>
      </Card>

      {totalSets > 0 && (
        <Card style={styles.card}>
          <TouchableRipple onPress={() => navigation.navigate('StatsDetail', { type: 'muscle', range })} borderless>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Avatar.Icon size={24} icon="chart-pie" style={styles.sectionIcon} color={theme.colors.warning} />
                <Text style={styles.sectionTitle}>肌群分布</Text>
                <View style={styles.chevronWrap}>
                  <Avatar.Icon size={16} icon="chevron-right" style={styles.chevron} color={theme.colors.textTertiary} />
                  <Text style={styles.tapHint}>查看热力图</Text>
                </View>
              </View>
            {Object.entries(muscleDist).map(([category, count]) => {
              const percentage = ((count / totalSets) * 100).toFixed(1);
              const color = categoryColors[category] || theme.colors.primary;
              return (
                <View key={category} style={styles.muscleBar}>
                  <View style={styles.muscleLabelContainer}>
                    <Avatar.Icon
                      size={20}
                      icon={categoryIcons[category] || 'dumbbell'}
                      style={[styles.muscleIcon, { backgroundColor: color + '20' }]}
                      color={color}
                    />
                    <Text style={styles.muscleLabel}>{categoryLabels[category] || category}</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: percentage + '%' as `${number}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.musclePercent, { color }]} numberOfLines={1}>{percentage}%</Text>
                </View>
              );
            })}
            </Card.Content>
          </TouchableRipple>
        </Card>
      )}

      {cardioRecords.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={24} icon="heart-pulse" style={styles.sectionIcon} color={theme.colors.success} />
              <Text style={styles.sectionTitle}>有氧统计</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Avatar.Icon size={28} icon="map-marker-distance" style={{ backgroundColor: 'transparent' }} color={theme.colors.success} />
                </View>
                <Text style={styles.statNumberDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {totalCardioDistance.toFixed(1)}
                </Text>
                <Text style={styles.statLabelDark}>总距离</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Avatar.Icon size={28} icon="fire" style={{ backgroundColor: 'transparent' }} color={theme.colors.warning} />
                </View>
                <Text style={styles.statNumberDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {totalCardioCalories}
                </Text>
                <Text style={styles.statLabelDark}>总消耗</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: theme.colors.primaryLight }]}>
                  <Avatar.Icon size={28} icon="clock-outline" style={{ backgroundColor: 'transparent' }} color={theme.colors.primary} />
                </View>
                <Text style={styles.statNumberDark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {Math.floor(totalCardioDuration / 60)}
                </Text>
                <Text style={styles.statLabelDark}>总时长</Text>
              </View>
            </View>

            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {rangeCardioRecords.length}
                </Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}次数</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {rangeCardioDistance.toFixed(1)}
                </Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}距离</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekStat}>
                <Text style={styles.weekNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {rangeCardioCalories}
                </Text>
                <Text style={styles.weekLabel}>{rangeLabels[range]}消耗</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={24} icon="history" style={styles.sectionIcon} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>历史记录</Text>
          </View>
          {strengthRecords.length > 0 ? (
            strengthRecords.slice(-5).reverse().map((record, index) => (
              <View key={record.id}>
                <View
                  style={styles.recordItem}
                  onTouchEnd={() => navigation.navigate('WorkoutRecordDetail', { recordId: record.id })}
                >
                  <View style={styles.recordLeft}>
                    <Avatar.Icon size={36} icon="dumbbell" style={styles.recordIcon} color={theme.colors.primary} />
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordDate}>{record.date}</Text>
                      <Text style={styles.recordVolume}>
                        容量: {(record.totalVolume || 0).toLocaleString()} kg · {record.duration}分钟
                      </Text>
                    </View>
                  </View>
                  <Avatar.Icon size={20} icon="chevron-right" style={{ backgroundColor: 'transparent' }} color={theme.colors.textTertiary} />
                </View>
                {index < Math.min(strengthRecords.length, 5) - 1 && <Divider style={styles.recordDivider} />}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.noRecord}>暂无训练记录</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('Prediction')}
        style={styles.predictionButton}
        labelStyle={styles.predictionButtonLabel}
        icon="trending-up"
      >
        查看身体预测
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  headerIcon: {
    backgroundColor: theme.colors.primaryLight,
    marginRight: 12,
  },
  rangeSwitch: {
    marginBottom: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  card: {
    ...cardStyle,
    marginBottom: cardSpacing.marginBottom,
  },
  overviewCard: {
    ...cardStyle,
    backgroundColor: theme.colors.primary,
    elevation: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  chevron: {
    backgroundColor: 'transparent',
  },
  tapHint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginLeft: 2,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statNumberDark: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabelDark: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingVertical: 8,
  },
  weekStat: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  weekNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  weekLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  chart: {
    marginTop: 8,
    marginLeft: -8,
    borderRadius: 12,
  },
  targetBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  targetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  targetTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  targetSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  targetDetail: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  targetWarn: {
    fontSize: 11,
    color: theme.colors.warning,
    marginTop: 8,
    lineHeight: 17,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkLabel: {
    width: 46,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  checkBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  checkBarFill: {
    height: 6,
    borderRadius: 3,
  },
  checkValue: {
    minWidth: 86,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
  },
  adviceWrap: {
    marginTop: 2,
  },
  adviceText: {
    fontSize: 11,
    lineHeight: 17,
  },
  targetFoot: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  dailyIssue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  metricSwitch: {
    marginTop: 4,
    marginBottom: 4,
  },
  dailyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 2,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  dailyLeft: {
    flex: 1,
  },
  dailyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dailyMacros: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dailyRight: {
    alignItems: 'flex-end',
  },
  dailyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dailyKg: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  dailyDivider: {
    backgroundColor: '#F1F5F9',
  },
  muscleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
  },
  muscleIcon: {
    marginRight: 6,
  },
  muscleLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  musclePercent: {
    minWidth: 52,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  predictionButton: {
    marginVertical: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
  },
  predictionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    backgroundColor: theme.colors.primaryLight,
  },
  recordInfo: {
    marginLeft: 12,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  recordVolume: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recordDivider: {
    marginVertical: 4,
    backgroundColor: theme.colors.border,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRecord: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
});
