import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ProgressBar, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { predictMuscleGrowth, generateOptimizationSuggestions } from '../utils/prediction';
import { predictBodyRecomposition } from '../utils/fatLossPrediction';
import { MuscleGrowthPrediction, BodyRecompositionPrediction } from '../types';

type PredictionTab = 'muscle' | 'fatloss' | 'recomposition';

export default function PredictionScreen({ navigation }: any) {
  const { userProfile, workoutRecords, dailyActivities } = useAppStore();
  const [activeTab, setActiveTab] = useState<PredictionTab>('recomposition');
  const [musclePrediction, setMusclePrediction] = useState<MuscleGrowthPrediction | null>(null);
  const [recomposition, setRecomposition] = useState<BodyRecompositionPrediction | null>(null);

  useEffect(() => {
    if (userProfile) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const weekRecords = workoutRecords.filter(r =>
        new Date(r.date) >= weekStart && r.status === 'completed'
      );

      const strengthRecords = weekRecords.filter(r => r.workoutType === 'strength');
      const cardioRecords = weekRecords.filter(r => r.workoutType === 'cardio');

      const weeklyVolume = strengthRecords.reduce((sum, r) => sum + r.totalVolume, 0);
      const weeklyCardioMinutes = cardioRecords.reduce((sum, r) => sum + r.duration, 0);
      const weeklyCardioCalories = cardioRecords.reduce((sum, r) => sum + (r.totalCalories || 0), 0);
      const weeklyStrengthMinutes = strengthRecords.reduce((sum, r) => sum + r.duration, 0);

      // 计算最近7天的日常活动数据
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekActivities = dailyActivities.filter(a => new Date(a.date) >= weekStart);
      const dailyActiveCalories = weekActivities.length > 0
        ? weekActivities.reduce((sum, a) => sum + a.activeCalories, 0) / weekActivities.length
        : 0;
      const dailySteps = weekActivities.length > 0
        ? weekActivities.reduce((sum, a) => sum + a.steps, 0) / weekActivities.length
        : 0;

      const muscleInput = {
        userWeight: userProfile.weight,
        age: userProfile.age,
        gender: userProfile.gender,
        trainingYears: userProfile.trainingYears,
        weeklyVolume,
        proteinIntake: userProfile.proteinIntake,
        sleepHours: userProfile.sleepHours,
      };

      const muscleResult = predictMuscleGrowth(muscleInput);
      const muscleData: MuscleGrowthPrediction = {
        id: Date.now().toString(),
        userId: userProfile.id,
        date: new Date().toISOString().split('T')[0],
        weeklyVolume,
        predictedMonthlyGain: muscleResult.monthlyGain,
        predictedYearlyGain: muscleResult.yearlyGain,
        confidence: muscleResult.confidence,
        factors: muscleResult.factors,
      };
      setMusclePrediction(muscleData);

      const fatLossInput = {
        userWeight: userProfile.weight,
        age: userProfile.age,
        gender: userProfile.gender,
        height: userProfile.height,
        bodyFat: userProfile.bodyFat,
        weeklyCardioMinutes,
        weeklyCardioCalories: weeklyCardioCalories + Math.round(dailyActiveCalories * 7),
        weeklyStrengthMinutes,
        dailyCalorieIntake: userProfile.dailyCalorieIntake || 2000,
        proteinIntake: userProfile.proteinIntake,
        sleepHours: userProfile.sleepHours,
      };

      const recompResult = predictBodyRecomposition(muscleInput, fatLossInput, userProfile, muscleData);
      setRecomposition(recompResult);
    }
  }, [userProfile, workoutRecords]);

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Avatar.Icon size={80} icon="account-alert" style={styles.emptyIcon} color="#CBD5E1" />
        <Text style={styles.noDataText}>请先设置身体数据</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('BodyData')}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          icon="arrow-right"
        >
          设置身体数据
        </Button>
      </View>
    );
  }

  if (!recomposition || !musclePrediction) {
    return (
      <View style={styles.container}>
        <Avatar.Icon size={64} icon="loading" style={styles.loadingIcon} color="#6366F1" />
        <Text style={styles.loadingText}>计算中...</Text>
      </View>
    );
  }

  const tabs: { key: PredictionTab; label: string; icon: string }[] = [
    { key: 'recomposition', label: '身体重组', icon: 'swap-horizontal' },
    { key: 'muscle', label: '增肌预测', icon: 'arm-flex' },
    { key: 'fatloss', label: '减脂预测', icon: 'fire' },
  ];

  const renderRecomposition = () => (
    <>
      <Card style={[styles.card, styles.overviewCard]}>
        <Card.Content>
          <Text style={styles.overviewTitle}>身体成分重组预览</Text>
          <View style={styles.recompositionGrid}>
            <View style={[styles.recompItem, { backgroundColor: '#EEF2FF' }]}>
              <Avatar.Icon size={32} icon="arm-flex" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
              <Text style={[styles.recompValue, { color: '#6366F1' }]}>+{recomposition.muscleGain.predictedMonthlyGain.toFixed(2)}</Text>
              <Text style={styles.recompUnit}>kg 肌肉/月</Text>
            </View>
            <View style={[styles.recompItem, { backgroundColor: '#FEF2F2' }]}>
              <Avatar.Icon size={32} icon="fire" style={{ backgroundColor: 'transparent' }} color="#EF4444" />
              <Text style={[styles.recompValue, { color: '#EF4444' }]}>-{recomposition.fatLoss.predictedMonthlyFatLoss.toFixed(2)}</Text>
              <Text style={styles.recompUnit}>kg 脂肪/月</Text>
            </View>
          </View>
          <View style={styles.netChangeRow}>
            <Text style={styles.netChangeLabel}>净体重变化</Text>
            <Text style={[styles.netChangeValue, { color: recomposition.netWeightChange >= 0 ? '#6366F1' : '#10B981' }]}>
              {recomposition.netWeightChange >= 0 ? '+' : ''}{recomposition.netWeightChange.toFixed(2)} kg/月
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>身体成分改善评分</Text>
            <Text style={styles.scoreValue}>{recomposition.bodyCompositionScore}</Text>
          </View>
          <ProgressBar
            progress={recomposition.bodyCompositionScore / 100}
            color="#6366F1"
            style={styles.scoreBar}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={20} icon="lightbulb-on" style={styles.sectionIcon} color="#F59E0B" />
            <Text style={styles.sectionTitle}>联动优化建议</Text>
          </View>
          {recomposition.recommendations.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <View style={styles.suggestionBullet}>
                <Avatar.Icon size={16} icon="check" style={{ backgroundColor: 'transparent' }} color="#10B981" />
              </View>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </>
  );

  const renderMusclePrediction = () => (
    <>
      <Card style={[styles.card, styles.overviewCard]}>
        <Card.Content>
          <Text style={styles.overviewTitle}>增肌预测</Text>
          <View style={styles.predictionOverview}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{musclePrediction.predictedMonthlyGain.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/月</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{musclePrediction.predictedYearlyGain.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/年</Text>
            </View>
          </View>
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>置信度</Text>
            <Text style={styles.confidenceValue}>{(musclePrediction.confidence * 100).toFixed(0)}%</Text>
          </View>
          <ProgressBar progress={musclePrediction.confidence} color="#fff" style={styles.confidenceBar} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={20} icon="chart-bar" style={styles.sectionIcon} color="#6366F1" />
            <Text style={styles.sectionTitle}>影响因素</Text>
          </View>
          {Object.entries(musclePrediction.factors).map(([factor, value]) => {
            const color = value >= 1.0 ? '#10B981' : value >= 0.8 ? '#F59E0B' : '#EF4444';
            return (
              <View key={factor} style={styles.factorRow}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{getFactorLabel(factor)}</Text>
                  <Text style={[styles.factorValue, { color }]}>{value.toFixed(2)}x</Text>
                </View>
                <ProgressBar progress={Math.min(value, 1.2) / 1.2} color={color} style={styles.factorBar} />
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </>
  );

  const renderFatLossPrediction = () => (
    <>
      <Card style={[styles.card, styles.fatLossCard]}>
        <Card.Content>
          <Text style={styles.overviewTitle}>减脂预测</Text>
          <View style={styles.predictionOverview}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{recomposition.fatLoss.predictedMonthlyFatLoss.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/月</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{recomposition.fatLoss.predictedWeeklyFatLoss.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/周</Text>
            </View>
          </View>
          {recomposition.fatLoss.timeToGoal && (
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>预计达到目标</Text>
              <Text style={styles.goalValue}>{recomposition.fatLoss.timeToGoal} 周</Text>
            </View>
          )}
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>置信度</Text>
            <Text style={styles.confidenceValue}>{(recomposition.fatLoss.confidence * 100).toFixed(0)}%</Text>
          </View>
          <ProgressBar progress={recomposition.fatLoss.confidence} color="#fff" style={styles.confidenceBar} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={20} icon="chart-bar" style={styles.sectionIcon} color="#EF4444" />
            <Text style={styles.sectionTitle}>减脂影响因素</Text>
          </View>
          {Object.entries(recomposition.fatLoss.factors).map(([factor, value]) => {
            const color = value >= 1.0 ? '#10B981' : value >= 0.8 ? '#F59E0B' : '#EF4444';
            return (
              <View key={factor} style={styles.factorRow}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{getFatLossFactorLabel(factor)}</Text>
                  <Text style={[styles.factorValue, { color }]}>{value.toFixed(2)}x</Text>
                </View>
                <ProgressBar progress={Math.min(value, 1.2) / 1.2} color={color} style={styles.factorBar} />
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="trending-up" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>身体预测</Text>
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Avatar.Icon
              size={20}
              icon={tab.icon}
              style={{ backgroundColor: 'transparent' }}
              color={activeTab === tab.key ? '#fff' : '#64748B'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'recomposition' && renderRecomposition()}
      {activeTab === 'muscle' && renderMusclePrediction()}
      {activeTab === 'fatloss' && renderFatLossPrediction()}

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('BodyData')}
        style={styles.updateButton}
        labelStyle={styles.updateButtonLabel}
        icon="pencil"
        textColor="#6366F1"
      >
        更新身体数据
      </Button>
    </ScrollView>
  );
}

function getFactorLabel(factor: string): string {
  const labels: Record<string, string> = {
    baseGrowthRate: '基础增长率',
    ageFactor: '年龄系数',
    genderFactor: '性别系数',
    volumeFactor: '容量系数',
    nutritionFactor: '营养系数',
    recoveryFactor: '恢复系数',
  };
  return labels[factor] || factor;
}

function getFatLossFactorLabel(factor: string): string {
  const labels: Record<string, string> = {
    bmrFactor: '基础代谢系数',
    activityFactor: '活动消耗系数',
    dietFactor: '饮食控制系数',
    proteinFactor: '蛋白质保留系数',
    sleepFactor: '睡眠恢复系数',
    genderFactor: '性别系数',
  };
  return labels[factor] || factor;
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#6366F1',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#fff',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  overviewCard: {
    backgroundColor: '#6366F1',
  },
  fatLossCard: {
    backgroundColor: '#EF4444',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  recompositionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recompItem: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  recompValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  recompUnit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  netChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  netChangeLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  netChangeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  predictionOverview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  predictionValue: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
  },
  predictionUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  predictionDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  confidenceBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  factorRow: {
    marginBottom: 14,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  factorValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  factorBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 10,
    alignItems: 'flex-start',
  },
  suggestionBullet: {
    marginRight: 6,
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  updateButton: {
    marginVertical: 20,
    borderRadius: 12,
    borderColor: '#6366F1',
    borderWidth: 1.5,
    paddingVertical: 4,
  },
  updateButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyIcon: {
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#64748B',
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIcon: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});
