import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { Text, Card, Button, TextInput, Divider, Chip, SegmentedButtons, IconButton } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../store';
import { theme, cardStyle, pagePadding } from '../theme';
import { BodyFatSource } from '../types';
import {
  fuseBodyFat,
  aggregateContributions,
  getBodyFatTrend,
  getBodyFatSeries,
  computeCalibration,
  calibrateValue,
  SOURCE_LABELS,
  SOURCE_SIGMA,
} from '../utils/bodyFatFusion';
import { estimateBodyFatFromWaist, waistToHeightRatio } from '../utils/bodyFatEstimators';
import BodyFatPhotoCard from '../components/BodyFatPhotoCard';

// 手动录入支持的三类来源（腰围与拍照有独立入口）
type ManualSource = 'scale' | 'manual' | 'inbody';

const SOURCE_COLORS: Record<BodyFatSource, string> = {
  inbody: '#0EA5E9',
  scale: '#10B981',
  manual: '#6366F1',
  waist: '#F59E0B',
  photo: '#94A3B8',
};

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}月${parts[2]}日`;
}

export default function BodyFatScreen(_props: any) {
  const {
    userProfile,
    bodyFatSamples,
    bodyFatCalibration,
    addBodyFatSample,
    addBodyFatSamples,
    deleteBodyFatSample,
    setBodyFatCalibration,
  } = useAppStore();

  const { width: screenWidth } = useWindowDimensions();

  const [sourceInput, setSourceInput] = useState<ManualSource>('scale');
  const [valueInput, setValueInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [anchorInput, setAnchorInput] = useState('');

  const fused = useMemo(
    () => fuseBodyFat({ samples: bodyFatSamples, calibration: bodyFatCalibration }),
    [bodyFatSamples, bodyFatCalibration]
  );
  const contributions = useMemo(() => aggregateContributions(fused), [fused]);
  const trend = useMemo(
    () => getBodyFatTrend({ samples: bodyFatSamples, calibration: bodyFatCalibration, windowDays: 30 }),
    [bodyFatSamples, bodyFatCalibration]
  );
  const series = useMemo(
    () => getBodyFatSeries(bodyFatSamples, bodyFatCalibration, 30),
    [bodyFatSamples, bodyFatCalibration]
  );

  const waistEstimate = useMemo(() => {
    const w = parseFloat(waistInput);
    if (!Number.isFinite(w)) return null;
    return estimateBodyFatFromWaist({
      waistCm: w,
      heightCm: userProfile?.height,
      gender: userProfile?.gender,
      age: userProfile?.age,
    });
  }, [waistInput, userProfile]);

  const whtr = useMemo(() => {
    const w = parseFloat(waistInput);
    if (!Number.isFinite(w)) return null;
    return waistToHeightRatio(w, userProfile?.height);
  }, [waistInput, userProfile]);

  const sortedSamples = useMemo(
    () => [...bodyFatSamples].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)),
    [bodyFatSamples]
  );

  const handleAddSample = () => {
    const v = parseFloat(valueInput);
    if (!Number.isFinite(v) || v < 3 || v > 60) {
      Alert.alert('提示', '请输入有效的体脂率（3-60%）');
      return;
    }
    const date = new Date().toISOString().split('T')[0];
    const value = Math.round(v * 10) / 10;
    addBodyFatSample({
      id: `bfs-${date}-${sourceInput}`,
      date,
      value,
      source: sourceInput,
      createdAt: Date.now(),
    });
    setValueInput('');
    Alert.alert('已记录', `${SOURCE_LABELS[sourceInput]} ${value}%`);
  };

  const handleAddWaist = () => {
    const w = parseFloat(waistInput);
    if (!Number.isFinite(w) || w < 40 || w > 200) {
      Alert.alert('提示', '请输入有效的腰围（40-200 cm）');
      return;
    }
    if (waistEstimate === null) {
      Alert.alert('提示', '暂时无法推算，请先在「身体数据」里填写性别与年龄');
      return;
    }
    const date = new Date().toISOString().split('T')[0];
    addBodyFatSample({
      id: `bfs-${date}-waist`,
      date,
      value: waistEstimate,
      source: 'waist',
      note: `腰围 ${w}cm 推算`,
      createdAt: Date.now(),
    });
    setWaistInput('');
    Alert.alert('已记录', `腰围推算约 ${waistEstimate}%（误差较大，权重较低）`);
  };

  const handleCalibrate = () => {
    const v = parseFloat(anchorInput);
    if (!Number.isFinite(v) || v < 3 || v > 60) {
      Alert.alert('提示', '请输入有效的锚点体脂率（3-60%）');
      return;
    }
    const date = new Date().toISOString().split('T')[0];
    const value = Math.round(v * 10) / 10;
    const anchorSample = {
      id: `bfs-${date}-inbody`,
      date,
      value,
      source: 'inbody' as BodyFatSource,
      createdAt: Date.now(),
    };
    addBodyFatSamples([anchorSample]);

    const next = computeCalibration({
      samples: [anchorSample, ...bodyFatSamples],
      anchor: { value, date },
      prev: bodyFatCalibration,
    });
    setBodyFatCalibration(next);
    setAnchorInput('');

    const parts: string[] = [];
    if (next.scaleBias) parts.push(`体脂秤 ${next.scaleBias > 0 ? '+' : ''}${next.scaleBias}%`);
    if (next.photoBias) parts.push(`拍照 ${next.photoBias > 0 ? '+' : ''}${next.photoBias}%`);
    if (next.waistBias) parts.push(`腰围 ${next.waistBias > 0 ? '+' : ''}${next.waistBias}%`);
    Alert.alert(
      '校准完成',
      parts.length > 0
        ? `已学习系统偏差：${parts.join('，')}。之后这些来源会先校正再参与融合。`
        : '已记录锚点。前后 3 天内没有体脂秤/拍照样本，暂时无法计算偏差，多记几次后会自动校准。'
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除样本', '确定删除这条体脂样本吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteBodyFatSample(id) },
    ]);
  };

  const chartWidth = Math.max(240, screenWidth - 64);
  const chartSeries = series.slice(-10);
  const chartLabels = chartSeries.map((d) => {
    const parts = d.date.split('-');
    return `${Number(parts[1])}/${Number(parts[2])}`;
  });
  const chartData = chartSeries.map((d) => d.fused);
  const canChart = chartData.length >= 2;

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366F1' },
    propsForBackgroundLines: { stroke: '#F1F5F9' },
  };

  const target = userProfile?.targetBodyFat;
  const gap = fused && target !== undefined ? Math.round((fused.value - target) * 10) / 10 : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[pagePadding, { paddingTop: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 融合体脂 */}
      <Card style={[styles.card, styles.heroCard]}>
        <Card.Content>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>融合体脂（多源加权）</Text>
            <Text style={styles.heroCount}>{fused ? `${fused.sampleCount} 个样本` : '暂无数据'}</Text>
          </View>
          <View style={styles.heroMain}>
            <Text style={styles.heroValue}>{fused ? fused.value.toFixed(1) : '--'}</Text>
            <Text style={styles.heroUnit}>%</Text>
            {fused && (
              <Text style={styles.heroSigma}>±{fused.sigma.toFixed(1)}</Text>
            )}
          </View>
          <View style={styles.heroFooter}>
            {trend && (
              <Text style={[styles.heroTrend, { color: trend.slopePerWeek > 0 ? '#FCA5A5' : '#A7F3D0' }]}>
                {trend.slopePerWeek > 0 ? '↑' : '↓'} {Math.abs(trend.slopePerWeek).toFixed(2)}%/周
              </Text>
            )}
            {gap !== null && (
              <Text style={styles.heroTarget}>
                {gap > 0 ? `距目标 ${target}% 还差 ${gap} 个点` : `已达到目标 ${target}%`}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* 来源贡献 */}
      {contributions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>来源权重</Text>
            {contributions.map((c) => (
              <View key={c.source} style={styles.contribRow}>
                <View style={styles.contribHead}>
                  <View style={styles.contribNameRow}>
                    <View style={[styles.dot, { backgroundColor: SOURCE_COLORS[c.source] }]} />
                    <Text style={styles.contribName}>{SOURCE_LABELS[c.source]}</Text>
                    <Text style={styles.contribValue}>{c.value.toFixed(1)}%</Text>
                  </View>
                  <Text style={styles.contribWeight}>{c.weight}%</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(2, c.weight)}%`, backgroundColor: SOURCE_COLORS[c.source] },
                    ]}
                  />
                </View>
                {c.source === 'photo' && (
                  <Text style={styles.contribNote}>拍照估算误差最大（σ≈{SOURCE_SIGMA.photo}），权重最低</Text>
                )}
              </View>
            ))}
            <Text style={styles.footnote}>权重 = 1/σ² × 时间衰减，越可信、越近期的数据占比越高</Text>
          </Card.Content>
        </Card>
      )}

      {/* 体脂趋势 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>体脂趋势（近 30 天）</Text>
          {canChart ? (
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
          ) : (
            <Text style={styles.empty}>至少 2 天的体脂数据才会显示趋势曲线</Text>
          )}
        </Card.Content>
      </Card>

      {/* 快速录入 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>记录体脂</Text>
          <SegmentedButtons
            value={sourceInput}
            onValueChange={(v) => setSourceInput(v as ManualSource)}
            buttons={[
              { value: 'scale', label: '体脂秤' },
              { value: 'manual', label: '手动' },
              { value: 'inbody', label: 'InBody' },
            ]}
            style={styles.segmented}
          />
          <View style={styles.formRow}>
            <TextInput
              label="体脂率 (%)"
              value={valueInput}
              onChangeText={setValueInput}
              keyboardType="numeric"
              mode="outlined"
              style={styles.formInput}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
            <Button
              mode="contained"
              onPress={handleAddSample}
              style={styles.inlineBtn}
              labelStyle={styles.inlineBtnLabel}
            >
              保存
            </Button>
          </View>
          <Text style={styles.hint}>
            {sourceInput === 'inbody'
              ? 'InBody/DEXA 视为真值锚点，可作为校准其他设备的基准'
              : '同一来源同一天只保留最新一条'}
          </Text>
        </Card.Content>
      </Card>

      {/* 腰围推算 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>腰围推算</Text>
          <View style={styles.formRow}>
            <TextInput
              label="腰围 (cm)"
              value={waistInput}
              onChangeText={setWaistInput}
              keyboardType="numeric"
              mode="outlined"
              style={styles.formInput}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
            <Button
              mode="contained"
              onPress={handleAddWaist}
              style={styles.inlineBtn}
              labelStyle={styles.inlineBtnLabel}
            >
              推算并保存
            </Button>
          </View>
          <Text style={styles.hint}>
            {waistEstimate !== null
              ? `预计约 ${waistEstimate}%${whtr ? ` · 腰高比 ${whtr}` : ''}${userProfile?.height ? '' : '（填写身高后更准）'}`
              : '输入腰围后自动估算，误差较大，权重低于体脂秤'}
          </Text>
        </Card.Content>
      </Card>

      {/* 拍照估算 */}
      <BodyFatPhotoCard />

      {/* InBody 锚点校准 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>锚点校准</Text>
          {bodyFatCalibration?.anchorValue !== undefined ? (
            <View style={styles.calibBox}>
              <View style={styles.calibRow}>
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>{bodyFatCalibration.anchorValue}%</Text>
                  <Text style={styles.calibLabel}>锚点</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>
                    {bodyFatCalibration.scaleBias > 0 ? '+' : ''}{bodyFatCalibration.scaleBias}
                  </Text>
                  <Text style={styles.calibLabel}>体脂秤偏差</Text>
                </View>
                <View style={styles.dividerV} />
                <View style={styles.calibItem}>
                  <Text style={styles.calibValue}>
                    {bodyFatCalibration.photoBias > 0 ? '+' : ''}{bodyFatCalibration.photoBias}
                  </Text>
                  <Text style={styles.calibLabel}>拍照偏差</Text>
                </View>
              </View>
              <Text style={styles.calibDate}>
                锚点日期 {bodyFatCalibration.anchorDate ? formatDate(bodyFatCalibration.anchorDate) : '-'}
              </Text>
            </View>
          ) : (
            <Text style={styles.empty}>
              有 InBody / DEXA 报告时填入数值，系统会算出体脂秤和拍照估算的系统偏差，之后自动校正
            </Text>
          )}
          <View style={styles.formRow}>
            <TextInput
              label="InBody / DEXA 体脂率 (%)"
              value={anchorInput}
              onChangeText={setAnchorInput}
              keyboardType="numeric"
              mode="outlined"
              style={styles.formInput}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />
            <Button
              mode="outlined"
              onPress={handleCalibrate}
              style={styles.inlineBtn}
              labelStyle={styles.inlineBtnLabel}
            >
              校准
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 样本历史 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>多源样本（{sortedSamples.length}）</Text>
          {sortedSamples.length === 0 ? (
            <Text style={styles.empty}>还没有体脂样本。记录体重时填写体脂率会自动归档到这里。</Text>
          ) : (
            sortedSamples.slice(0, 30).map((s, i) => {
              const calibrated = calibrateValue(s, bodyFatCalibration);
              const adjusted = Math.abs(calibrated - s.value) >= 0.05;
              return (
                <View key={s.id}>
                  {i > 0 && <Divider style={styles.divider} />}
                  <View style={styles.sampleRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.sampleHead}>
                        <Text style={styles.sampleDate}>{formatDate(s.date)}</Text>
                        <Chip
                          compact
                          style={[styles.sourceChip, { backgroundColor: `${SOURCE_COLORS[s.source]}18` }]}
                          textStyle={[styles.sourceChipText, { color: SOURCE_COLORS[s.source] }]}
                        >
                          {SOURCE_LABELS[s.source]}
                        </Chip>
                      </View>
                      <Text style={styles.sampleMeta}>
                        {s.value}%{adjusted ? ` → 校准后 ${calibrated.toFixed(1)}%` : ''}
                        {s.note ? ` · ${s.note}` : ''}
                      </Text>
                    </View>
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={theme.colors.textTertiary}
                      onPress={() => handleDelete(s.id)}
                      style={{ margin: 0 }}
                    />
                  </View>
                </View>
              );
            })
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
  heroCard: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  heroCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  heroValue: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroUnit: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 4,
  },
  heroSigma: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 10,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  heroTrend: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroTarget: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  contribRow: {
    marginBottom: 10,
  },
  contribHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contribNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  contribName: {
    fontSize: 13,
    color: theme.colors.text,
  },
  contribValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  contribWeight: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    marginTop: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  contribNote: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  footnote: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    lineHeight: 19,
  },
  chart: {
    marginTop: 4,
    marginLeft: -8,
    borderRadius: 12,
  },
  segmented: {
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  formInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inlineBtn: {
    borderRadius: 10,
  },
  inlineBtnLabel: {
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 8,
  },
  calibBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  calibRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calibItem: {
    flex: 1,
    alignItems: 'center',
  },
  calibValue: {
    fontSize: 16,
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
  calibDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: theme.colors.border,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sampleHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sampleDate: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  sourceChip: {
    height: 22,
  },
  sourceChipText: {
    fontSize: 10,
    marginVertical: 0,
  },
  sampleMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
});
