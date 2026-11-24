import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, Divider, Switch, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../store';
import { theme, cardStyle, pagePadding } from '../theme';
import { getWeightTrend, getWeightSeries, getWeightChange } from '../utils/bodyTrend';
import { buildCalibration, computePredictionError } from '../utils/calibration';
import { calculateBMR } from '../utils/fatLossPrediction';
import { fuseBodyFat } from '../utils/bodyFatFusion';
import { scheduleWeightReminder, cancelWeightReminder, isReminderScheduled } from '../services/notifications';

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${weekdays[d.getDay()]}`;
}

export default function BodyTrackScreen({ navigation }: any) {
  const {
    userProfile,
    bodyMeasurements,
    addBodyMeasurement,
    deleteBodyMeasurement,
    getNutritionStats,
    calibration,
    predictionSnapshots,
    setCalibration,
    foodLogs,
    bodyFatSamples,
    bodyFatCalibration,
  } = useAppStore();

  const { width: screenWidth } = useWindowDimensions();
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [bodyFatSourceInput, setBodyFatSourceInput] = useState<'scale' | 'manual' | 'inbody'>('scale');
  const [waistInput, setWaistInput] = useState('');
  const [reminderOn, setReminderOn] = useState(false);

  const trend = getWeightTrend(bodyMeasurements);
  const series = useMemo(() => getWeightSeries(bodyMeasurements, 30), [bodyMeasurements]);
  const change = getWeightChange(bodyMeasurements, 30);
  const fusedBodyFat = useMemo(
    () => fuseBodyFat({ samples: bodyFatSamples, calibration: bodyFatCalibration }),
    [bodyFatSamples, bodyFatCalibration]
  );

  useEffect(() => {
    isReminderScheduled().then(setReminderOn).catch(() => {});
  }, []);

  // 自动校准：用实际摄入 + 实际体重变化反推真实 TDEE
  useEffect(() => {
    if (!userProfile || bodyMeasurements.length < 2) return;
    const stats = getNutritionStats(21);
    if (stats.days < 3 || stats.avgCalories <= 0) return;

    const bmr = calculateBMR(trend ?? userProfile.weight, userProfile.height, userProfile.age, userProfile.gender);
    const formulaTDEE = bmr * 1.375;
    const next = buildCalibration({
      measurements: bodyMeasurements,
      avgDailyIntake: stats.avgCalories,
      formulaTDEE,
      prev: calibration,
    });
    if (next) setCalibration(next);
  }, [bodyMeasurements, foodLogs]);

  const error = useMemo(
    () => computePredictionError({ snapshots: predictionSnapshots, measurements: bodyMeasurements }),
    [predictionSnapshots, bodyMeasurements]
  );

  const handleSave = () => {
    const w = parseFloat(weightInput);
    if (!Number.isFinite(w) || w < 20 || w > 400) {
      Alert.alert('提示', '请输入有效的体重（20-400 kg）');
      return;
    }
    const bf = bodyFatInput.trim() ? parseFloat(bodyFatInput) : undefined;
    if (bf !== undefined && (!Number.isFinite(bf) || bf < 3 || bf > 60)) {
      Alert.alert('提示', '请输入有效的体脂率（3-60%）');
      return;
    }
    const waist = waistInput.trim() ? parseFloat(waistInput) : undefined;

    addBodyMeasurement({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      weight: Math.round(w * 10) / 10,
      bodyFat: bf !== undefined ? Math.round(bf * 10) / 10 : undefined,
      bodyFatSource: bf !== undefined ? bodyFatSourceInput : undefined,
      waist: waist !== undefined && Number.isFinite(waist) ? waist : undefined,
      createdAt: Date.now(),
    });

    setWeightInput('');
    setBodyFatInput('');
    setWaistInput('');
    Alert.alert('已记录', '体重已保存，预测会据此自动校准');
  };

  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      const ok = await scheduleWeightReminder();
      if (!ok) {
        Alert.alert('无法开启提醒', '请在系统设置中允许通知权限');
        return;
      }
      setReminderOn(true);
    } else {
      await cancelWeightReminder();
      setReminderOn(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除记录', '确定删除这条测量记录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteBodyMeasurement(id) },
    ]);
  };

  const chartWidth = Math.max(240, screenWidth - 64);
  const recentSeries = series.slice(-10);
  const chartLabels = recentSeries.map((s) => {
    const parts = s.date.split('-');
    return `${Number(parts[1])}/${Number(parts[2])}`;
  });
  const chartData = recentSeries.map((s) => s.weight);
  const canChart = chartData.length >= 2;

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#10B981' },
    propsForBackgroundLines: { stroke: '#F1F5F9' },
  };

  const sortedMeasurements = [...bodyMeasurements].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[pagePadding, { paddingTop: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 当前体重 */}
      <Card style={[styles.card, styles.weightCard]}>
        <Card.Content>
          <View style={styles.weightHeader}>
            <Text style={styles.weightLabel}>当前体重（7 日均值）</Text>
            <Text style={styles.weightSource}>{bodyMeasurements.length} 条记录</Text>
          </View>
          <View style={styles.weightMain}>
            <Text style={styles.weightValue}>{trend ?? userProfile?.weight ?? '--'}</Text>
            <Text style={styles.weightUnit}>kg</Text>
            {change && (
              <Text style={[styles.weightDelta, { color: change.delta <= 0 ? '#10B981' : '#EF4444' }]}>
                {change.delta > 0 ? '+' : ''}{change.delta.toFixed(1)}kg / {change.spanDays}天
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 融合体脂（多源） */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.bfRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bfLabel}>融合体脂（多源加权）</Text>
              <View style={styles.bfValueRow}>
                <Text style={styles.bfValue}>
                  {fusedBodyFat ? `${fusedBodyFat.value.toFixed(1)}%` : '--'}
                </Text>
                {fusedBodyFat && (
                  <Text style={styles.bfSigma}>
                    ±{fusedBodyFat.sigma.toFixed(1)} · {fusedBodyFat.sampleCount} 个样本
                  </Text>
                )}
              </View>
              <Text style={styles.bfHint}>
                {fusedBodyFat
                  ? '已按来源可信度与时间衰减加权，拍照权重最低'
                  : '记录体脂秤 / InBody / 拍照数据后自动融合'}
              </Text>
            </View>
            <Button
              mode="outlined"
              compact
              onPress={() => navigation?.navigate('BodyFat')}
              style={styles.bfBtn}
              labelStyle={styles.bfBtnLabel}
            >
              详情
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 记录表单 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>记录今天</Text>
          <View style={styles.formRow}>
            <TextInput
              label="体重 (kg)"
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              mode="outlined"
              style={styles.formInput}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
            <TextInput
              label="体脂 (%) 可选"
              value={bodyFatInput}
              onChangeText={setBodyFatInput}
              keyboardType="numeric"
              mode="outlined"
              style={styles.formInput}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
          </View>
          <SegmentedButtons
            value={bodyFatSourceInput}
            onValueChange={(v) => setBodyFatSourceInput(v as 'scale' | 'manual' | 'inbody')}
            buttons={[
              { value: 'scale', label: '体脂秤' },
              { value: 'manual', label: '手动' },
              { value: 'inbody', label: 'InBody' },
            ]}
            density="small"
            style={styles.sourceSegmented}
          />
          <TextInput
            label="腰围 (cm) 可选"
            value={waistInput}
            onChangeText={setWaistInput}
            keyboardType="numeric"
            mode="outlined"
            style={[styles.formInput, { marginTop: 10 }]}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />
          <Button
            mode="contained"
            icon="content-save"
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.saveLabel}
          >
            保存测量
          </Button>
          <Text style={styles.formHint}>建议晨起空腹、同一体重秤测量，数据更稳定</Text>
        </Card.Content>
      </Card>

      {/* 体重趋势 */}
      {canChart && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>体重趋势（近 30 天）</Text>
            <LineChart
              data={{ labels: chartLabels, datasets: [{ data: chartData }] }}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              bezier
              withShadow={false}
              withInnerLines
              withOuterLines={false}
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* 校准与误差 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>预测校准</Text>
          {calibration ? (
            <>
              <View style={styles.calibRow}>
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>×{calibration.tdeeFactor.toFixed(2)}</Text>
                  <Text style={styles.calibLabel}>代谢修正</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>{calibration.sampleDays}</Text>
                  <Text style={styles.calibLabel}>样本天数</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>{Math.round(calibration.confidence * 100)}%</Text>
                  <Text style={styles.calibLabel}>置信度</Text>
                </View>
              </View>
              <Text style={styles.calibHint}>
                {calibration.tdeeFactor > 1.05
                  ? '你的实际消耗高于公式估算，预测已上调'
                  : calibration.tdeeFactor < 0.95
                  ? '你的实际消耗低于公式估算，预测已下调'
                  : '你的代谢接近公式估算'}
              </Text>
            </>
          ) : (
            <Text style={styles.calibEmpty}>
              记录至少 2 次体重，并连续记录几天饮食后，系统会自动校准
            </Text>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>历史预测误差</Text>
              <Text style={styles.errorText}>
                {error.samples} 次对比 · 平均偏差约 {error.meanAbsPercent}%（{error.meanAbsKg} kg/周）
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 提醒 */}
      <Card style={styles.card}>
        <Card.Content style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>每周体重提醒</Text>
            <Text style={styles.reminderHint}>每周一 8:00 提醒记录，帮助保持数据连续</Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={(v) => { void handleToggleReminder(v); }}
            color={theme.colors.primary}
          />
        </Card.Content>
      </Card>

      {/* 历史记录 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>历史记录</Text>
          {sortedMeasurements.length === 0 ? (
            <Text style={styles.calibEmpty}>还没有记录</Text>
          ) : (
            sortedMeasurements.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <Divider style={styles.divider} />}
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>{formatDate(m.date)}</Text>
                    <Text style={styles.historyMeta}>
                      {m.weight} kg
                      {m.bodyFat !== undefined ? ` · 体脂 ${m.bodyFat}%` : ''}
                      {m.waist !== undefined ? ` · 腰围 ${m.waist}cm` : ''}
                    </Text>
                  </View>
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    iconColor={theme.colors.textTertiary}
                    onPress={() => handleDelete(m.id)}
                    style={{ margin: 0 }}
                  />
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
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
  weightCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  weightSource: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  weightMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  weightValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  weightUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 6,
  },
  weightDelta: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sourceSegmented: {
    marginTop: 10,
  },
  bfRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bfLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bfValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  bfValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bfSigma: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  bfHint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  bfBtn: {
    borderRadius: 10,
    marginLeft: 8,
  },
  bfBtnLabel: {
    fontSize: 12,
  },
  formInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
  saveLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  formHint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  chart: {
    marginTop: 4,
    marginLeft: -8,
    borderRadius: 12,
  },
  calibRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
  },
  calibItem: {
    flex: 1,
    alignItems: 'center',
  },
  calibValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  calibLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  dividerV: {
    width: 1,
    height: 26,
    backgroundColor: theme.colors.border,
  },
  calibHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },
  calibEmpty: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    lineHeight: 19,
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  errorText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 3,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reminderHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
    marginRight: 8,
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  historyMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
});
