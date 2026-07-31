import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, ProgressBar, Chip } from 'react-native-paper';
import { useAppStore } from '../store';
import { predictMuscleGrowth, generateOptimizationSuggestions } from '../utils/prediction';
import { MuscleGrowthPrediction } from '../types';

export default function PredictionScreen({ navigation }: any) {
  const { userProfile, workoutRecords } = useAppStore();
  const [prediction, setPrediction] = useState<MuscleGrowthPrediction | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (userProfile) {
      // 计算本周训练容量
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekRecords = workoutRecords.filter(r => 
        new Date(r.date) >= weekStart && r.status === 'completed'
      );
      const weeklyVolume = weekRecords.reduce((sum, r) => sum + r.totalVolume, 0);

      const result = predictMuscleGrowth({
        userWeight: userProfile.weight,
        age: userProfile.age,
        gender: userProfile.gender,
        trainingYears: userProfile.trainingYears,
        weeklyVolume,
        proteinIntake: userProfile.proteinIntake,
        sleepHours: userProfile.sleepHours,
      });

      const predictionData: MuscleGrowthPrediction = {
        id: Date.now().toString(),
        userId: userProfile.id,
        date: new Date().toISOString().split('T')[0],
        weeklyVolume,
        predictedMonthlyGain: result.monthlyGain,
        predictedYearlyGain: result.yearlyGain,
        confidence: result.confidence,
        factors: result.factors,
      };

      setPrediction(predictionData);
      setSuggestions(generateOptimizationSuggestions(predictionData, userProfile));
    }
  }, [userProfile, workoutRecords]);

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noDataText}>请先设置身体数据</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('BodyData')}
              style={styles.button}
            >
              设置身体数据
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.container}>
        <Text>计算中...</Text>
      </View>
    );
  }

  const getFactorLabel = (factor: string) => {
    const labels: Record<string, string> = {
      baseGrowthRate: '基础增长率',
      ageFactor: '年龄系数',
      genderFactor: '性别系数',
      volumeFactor: '容量系数',
      nutritionFactor: '营养系数',
      recoveryFactor: '恢复系数',
    };
    return labels[factor] || factor;
  };

  const getFactorDescription = (factor: string, value: number) => {
    if (factor === 'ageFactor') {
      if (value >= 1.0) return '黄金期/标准期';
      if (value >= 0.7) return '下降期/中年期';
      return '老年期';
    }
    if (factor === 'genderFactor') {
      return value >= 1.0 ? '男性' : '女性';
    }
    if (value >= 1.0) return '优秀';
    if (value >= 0.8) return '良好';
    if (value >= 0.6) return '一般';
    return '需改善';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 肌肉增长预测</Text>

      {/* 预测概览 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>预测概览</Text>
          <View style={styles.predictionOverview}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{prediction.predictedMonthlyGain.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/月</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{prediction.predictedYearlyGain.toFixed(2)}</Text>
              <Text style={styles.predictionUnit}>kg/年</Text>
            </View>
          </View>
          <Text style={styles.confidence}>
            置信度: {(prediction.confidence * 100).toFixed(0)}%
          </Text>
          <ProgressBar
            progress={prediction.confidence}
            color="#1A5F7A"
            style={styles.confidenceBar}
          />
        </Card.Content>
      </Card>

      {/* 影响因素分析 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>影响因素分析</Text>
          {Object.entries(prediction.factors).map(([factor, value]) => (
            <View key={factor} style={styles.factorRow}>
              <View style={styles.factorHeader}>
                <Text style={styles.factorName}>{getFactorLabel(factor)}</Text>
                <Text style={styles.factorValue}>{value.toFixed(2)}x</Text>
              </View>
              <ProgressBar
                progress={Math.min(value, 1.2) / 1.2}
                color={value >= 0.8 ? '#28A745' : value >= 0.6 ? '#FFC107' : '#FF6B35'}
                style={styles.factorBar}
              />
              <Text style={styles.factorDescription}>
                {getFactorDescription(factor, value)}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* 个性化建议 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>💡 优化建议</Text>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Text style={styles.suggestionBullet}>•</Text>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noSuggestions}>您的训练和恢复状况良好，继续保持！</Text>
          )}
        </Card.Content>
      </Card>

      {/* 更新数据按钮 */}
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('BodyData')}
        style={styles.updateButton}
      >
        更新身体数据
      </Button>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  predictionOverview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  predictionItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  predictionValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  predictionUnit: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  predictionDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e0e0e0',
  },
  confidence: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
  },
  factorRow: {
    marginBottom: 15,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  factorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  factorBar: {
    height: 8,
    marginBottom: 4,
  },
  factorDescription: {
    fontSize: 12,
    color: '#666',
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 10,
  },
  suggestionBullet: {
    fontSize: 16,
    color: '#1A5F7A',
    marginRight: 8,
    fontWeight: 'bold',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  noSuggestions: {
    textAlign: 'center',
    color: '#28A745',
    fontSize: 14,
    padding: 20,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  updateButton: {
    marginVertical: 20,
  },
});
