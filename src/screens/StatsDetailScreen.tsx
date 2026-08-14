import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { Exercise, WorkoutRecord, DailyActivity } from '../types';

// ---------- 工具 ----------
export type Range = 'week' | 'month' | 'year';

export const rangeLabels: Record<Range, string> = {
  week: '本周', month: '本月', year: '本年',
};

interface Bucket { label: string; sub: string; start: string; end: string; }

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getBuckets(range: Range): Bucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Bucket[] = [];
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      buckets.push({ label: weekdays[d.getDay()], sub: `${d.getMonth() + 1}/${d.getDate()}`, start: ds, end: ds });
    }
  } else if (range === 'month') {
    for (let i = 4; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(end.getDate() - i * 6);
      const start = new Date(end);
      start.setDate(start.getDate() - 5);
      buckets.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        sub: `${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`,
        start: toDateStr(start), end: toDateStr(end),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      buckets.push({
        label: `${d.getMonth() + 1}月`,
        sub: `${d.getFullYear()}`,
        start: toDateStr(start), end: toDateStr(end),
      });
    }
  }
  return buckets;
}

function getRangeStart(range: Range): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6); return d;
  }
  if (range === 'month') {
    const d = new Date(today); d.setDate(d.getDate() - 29); return d;
  }
  return new Date(today.getFullYear(), today.getMonth() - 11, 1);
}

// ---------- 自定义分段控件 ----------
function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmentContainer}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.segmentItem, value === opt.value && styles.segmentItemActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---------- 柱状图 ----------
interface BarChartData { label: string; value: number; }

function BarChart({ data, color, unit }: { data: BarChartData[]; color: string; unit: string }) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 130, d.value > 0 ? 5 : 0);
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>{d.value > 0 ? formatNum(d.value) : ''}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: h, backgroundColor: d.value > 0 ? color : '#E2E8F0' }]} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.chartUnit}>单位：{unit}</Text>
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

// ---------- 肌肉映射 ----------
const MUSCLE_NORMALIZE: Record<string, string> = {
  '胸大肌': '胸大肌', '胸大肌内侧': '胸大肌', '胸大肌外侧': '胸大肌',
  '胸大肌上部': '胸大肌上部', '胸大肌下部': '胸大肌下部',
  '三角肌前束': '三角肌前束',
  '三角肌中束': '三角肌中束', '中束': '三角肌中束',
  '三角肌后束': '三角肌后束',
  '肱二头肌': '肱二头肌', '肱二头肌长头': '肱二头肌',
  '肱三头肌': '肱三头肌', '肱三头肌长头': '肱三头肌', '肱三头肌外侧头': '肱三头肌',
  '肱肌': '肱肌', '肱桡肌': '肱肌',
  '前臂': '前臂', '前臂屈肌': '前臂', '前臂伸肌': '前臂', '手部握力': '前臂',
  '背阔肌': '背阔肌', '背阔肌中部': '背阔肌', '大圆肌': '背阔肌',
  '斜方肌': '斜方肌', '斜方肌中下部': '斜方肌', '斜方肌下部': '斜方肌',
  '菱形肌': '菱形肌',
  '竖脊肌': '竖脊肌', '上背': '竖脊肌', '背': '竖脊肌',
  '腹直肌': '腹直肌', '腹直肌下部': '腹直肌',
  '腹斜肌': '腹斜肌', '腹横肌': '腹横肌',
  '臀大肌': '臀大肌',
  '臀中肌': '臀中肌', '臀小肌': '臀中肌',
  '髋屈肌': '髋屈肌', '内收肌': '内收肌',
  '股四头肌': '股四头肌',
  '腘绳肌': '腘绳肌',
  '腓肠肌': '小腿', '比目鱼肌': '小腿', '小腿': '小腿',
};

const MUSCLE_LABELS: Record<string, string> = {
  '胸大肌': '胸大肌', '胸大肌上部': '胸大肌上部', '胸大肌下部': '胸大肌下部',
  '三角肌前束': '三角肌前束', '三角肌中束': '三角肌中束', '三角肌后束': '三角肌后束',
  '肱二头肌': '肱二头肌', '肱三头肌': '肱三头肌', '肱肌': '肱肌',
  '前臂': '前臂',
  '背阔肌': '背阔肌', '斜方肌': '斜方肌', '菱形肌': '菱形肌', '竖脊肌': '竖脊肌',
  '腹直肌': '腹直肌', '腹斜肌': '腹斜肌', '腹横肌': '腹横肌',
  '臀大肌': '臀大肌', '臀中肌': '臀中肌', '髋屈肌': '髋屈肌', '内收肌': '内收肌',
  '股四头肌': '股四头肌', '腘绳肌': '腘绳肌', '小腿': '小腿',
};

// ---------- 人体分区 ----------
interface BodyZone { key: string; label: string; muscles: string[]; }
const FRONT_ZONES: BodyZone[] = [
  { key: 'frontDelt', label: '前束', muscles: ['三角肌前束'] },
  { key: 'sideDelt', label: '中束', muscles: ['三角肌中束'] },
  { key: 'chest', label: '胸大肌', muscles: ['胸大肌', '胸大肌上部', '胸大肌下部'] },
  { key: 'biceps', label: '肱二头', muscles: ['肱二头肌'] },
  { key: 'forearmF', label: '前臂', muscles: ['前臂'] },
  { key: 'rectus', label: '腹直肌', muscles: ['腹直肌'] },
  { key: 'oblique', label: '腹斜肌', muscles: ['腹斜肌'] },
  { key: 'quad', label: '股四头', muscles: ['股四头肌'] },
  { key: 'adductor', label: '内收肌', muscles: ['内收肌'] },
  { key: 'shin', label: '小腿', muscles: ['小腿'] },
];
const BACK_ZONES: BodyZone[] = [
  { key: 'trap', label: '斜方肌', muscles: ['斜方肌'] },
  { key: 'rearDelt', label: '后束', muscles: ['三角肌后束'] },
  { key: 'lat', label: '背阔肌', muscles: ['背阔肌'] },
  { key: 'rhomboid', label: '菱形肌', muscles: ['菱形肌'] },
  { key: 'erector', label: '竖脊肌', muscles: ['竖脊肌'] },
  { key: 'triceps', label: '肱三头', muscles: ['肱三头肌'] },
  { key: 'forearmB', label: '前臂', muscles: ['前臂'] },
  { key: 'glute', label: '臀大肌', muscles: ['臀大肌'] },
  { key: 'gluteMed', label: '臀中肌', muscles: ['臀中肌'] },
  { key: 'hamstring', label: '腘绳肌', muscles: ['腘绳肌'] },
  { key: 'calf', label: '小腿', muscles: ['小腿'] },
];

// 强度 → 颜色（浅蓝 #DBEAFE → 深蓝紫 #4338CA）
function intensityColor(t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * clamp);
  const r = lerp(0xDB, 0x43), g = lerp(0xEA, 0x38), b = lerp(0xFE, 0xCA);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ---------- 人体肌肉热力图（仿人体轮廓） ----------
function BodyMap({
  muscleStats, maxSets, side, selected, onSelect,
}: {
  muscleStats: Record<string, number>; maxSets: number;
  side: 'front' | 'back'; selected: string | null; onSelect: (muscle: string) => void;
}) {
  const all = [...FRONT_ZONES, ...BACK_ZONES];
  const findZone = (key: string) => all.find(x => x.key === key);

  // 渲染单个肌肉分区
  const Z = (key: string, w: number, h: number) => {
    const zone = findZone(key);
    if (!zone) return <View style={{ width: w }} />;
    const sets = zone.muscles.reduce((s, m) => s + (muscleStats[m] || 0), 0);
    const t = maxSets > 0 ? sets / maxSets : 0;
    const bg = sets === 0 ? '#E2E8F0' : intensityColor(t);
    return (
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => onSelect(zone.muscles[0])}
        style={[
          styles.bodyZone,
          { width: w, height: h, backgroundColor: bg },
          selected === zone.muscles[0] && styles.bodyZoneSelected,
        ]}
      >
        <Text style={[styles.bodyZoneLabel, { color: sets > 0 ? '#fff' : '#94A3B8' }]}>{zone.label}</Text>
        {sets > 0 && <Text style={styles.bodyZoneSets}>{sets}</Text>}
      </TouchableOpacity>
    );
  };

  const gap = (w: number) => <View style={{ width: w }} />;

  return (
    <View style={styles.bodyMapWrap}>
      <View style={styles.bodyFigure}>
        {/* 头部 */}
        <View style={styles.bodyHead} />
        {/* 颈部 */}
        <View style={styles.bodyNeck} />

        {side === 'front' ? (
          <>
            {/* 肩膀 — 最宽 */}
            <View style={styles.bodyRow}>
              {Z('frontDelt', 36, 44)}
              {Z('chest', 52, 44)}
              {Z('frontDelt', 36, 44)}
            </View>
            {/* 上臂+胸下/中束 */}
            <View style={styles.bodyRow}>
              {Z('biceps', 30, 40)}
              {Z('sideDelt', 52, 40)}
              {Z('biceps', 30, 40)}
            </View>
            {/* 前臂+腹直肌 */}
            <View style={styles.bodyRow}>
              {Z('forearmF', 26, 40)}
              {Z('rectus', 46, 40)}
              {Z('forearmF', 26, 40)}
            </View>
            {/* 前臂+腹斜肌（收窄） */}
            <View style={styles.bodyRow}>
              {Z('forearmF', 24, 36)}
              {Z('oblique', 42, 36)}
              {Z('forearmF', 24, 36)}
            </View>
            {/* 大腿 */}
            <View style={styles.bodyRow}>
              {Z('quad', 38, 44)}
              {Z('adductor', 30, 44)}
              {Z('quad', 38, 44)}
            </View>
            {/* 小腿 */}
            <View style={styles.bodyRow}>
              {Z('shin', 32, 40)}
              {gap(8)}
              {Z('shin', 32, 40)}
            </View>
          </>
        ) : (
          <>
            {/* 肩膀 — 斜方肌 */}
            <View style={styles.bodyRow}>
              {Z('trap', 36, 44)}
              {Z('trap', 52, 44)}
              {Z('trap', 36, 44)}
            </View>
            {/* 后束+背阔肌上部 */}
            <View style={styles.bodyRow}>
              {Z('rearDelt', 32, 40)}
              {Z('lat', 50, 40)}
              {Z('rearDelt', 32, 40)}
            </View>
            {/* 肱三头+背阔肌下部 */}
            <View style={styles.bodyRow}>
              {Z('triceps', 28, 40)}
              {Z('lat', 48, 40)}
              {Z('triceps', 28, 40)}
            </View>
            {/* 前臂+竖脊肌（收窄） */}
            <View style={styles.bodyRow}>
              {Z('forearmB', 24, 36)}
              {Z('erector', 44, 36)}
              {Z('forearmB', 24, 36)}
            </View>
            {/* 臀部 */}
            <View style={styles.bodyRow}>
              {Z('glute', 38, 40)}
              {Z('gluteMed', 30, 40)}
              {Z('glute', 38, 40)}
            </View>
            {/* 腘绳肌 */}
            <View style={styles.bodyRow}>
              {Z('hamstring', 36, 42)}
              {gap(6)}
              {Z('hamstring', 36, 42)}
            </View>
            {/* 小腿 */}
            <View style={styles.bodyRow}>
              {Z('calf', 32, 38)}
              {gap(8)}
              {Z('calf', 32, 38)}
            </View>
          </>
        )}
      </View>

      {/* 图例 */}
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>少</Text>
        <View style={styles.legendBar}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <View key={i} style={{ flex: 1, height: 8, backgroundColor: intensityColor(t) }} />
          ))}
        </View>
        <Text style={styles.legendText}>多</Text>
      </View>
      <Text style={styles.bodyHint}>
        {side === 'front' ? '正面图 · 点击肌肉查看详情' : '背面图 · 点击肌肉查看详情'}
      </Text>
    </View>
  );
}

// ---------- 主页面 ----------
export default function StatsDetailScreen({ route }: any) {
  const type: 'activity' | 'stats' | 'muscle' = route.params?.type;
  const range: Range = route.params?.range || 'week';
  const { workoutRecords, exercises, dailyActivities } = useAppStore();

  const rangeStartMs = getRangeStart(range).getTime();
  const rangeRecords = useMemo(
    () => workoutRecords.filter((r: WorkoutRecord) => r.status === 'completed' && new Date(r.date).getTime() >= rangeStartMs),
    [workoutRecords, rangeStartMs]
  );
  const rangeActivities = useMemo(
    () => dailyActivities.filter((a: DailyActivity) => new Date(a.date).getTime() >= rangeStartMs),
    [dailyActivities, rangeStartMs]
  );

  if (type === 'activity') return <ActivityView dailyActivities={rangeActivities} range={range} />;
  if (type === 'stats') return <StatsView workoutRecords={rangeRecords} range={range} />;
  return <MuscleDistView workoutRecords={rangeRecords} exercises={exercises} range={range} />;
}

// ---------- 活动详情 ----------
function ActivityView({ dailyActivities, range }: { dailyActivities: DailyActivity[]; range: Range }) {
  const [metric, setMetric] = useState('steps');
  const buckets = getBuckets(range);

  const bucketAgg = useMemo(() => buckets.map(b => {
    const inRange = dailyActivities.filter((a: DailyActivity) => a.date >= b.start && a.date <= b.end);
    return {
      steps: inRange.reduce((s: number, a: DailyActivity) => s + a.steps, 0),
      cal: inRange.reduce((s: number, a: DailyActivity) => s + a.activeCalories, 0),
      dist: inRange.reduce((s: number, a: DailyActivity) => s + a.distanceKm, 0),
      activeCount: inRange.filter(a => a.steps > 0).length,
    };
  }), [dailyActivities, buckets]);

  const stepsData: BarChartData[] = buckets.map((b, i) => ({ label: b.label, value: bucketAgg[i].steps }));
  const calData: BarChartData[] = buckets.map((b, i) => ({ label: b.label, value: bucketAgg[i].cal }));
  const distData: BarChartData[] = buckets.map((b, i) => ({ label: b.label, value: bucketAgg[i].dist }));

  const totalSteps = bucketAgg.reduce((s: number, d) => s + d.steps, 0);
  const totalCal = bucketAgg.reduce((s: number, d) => s + d.cal, 0);
  const totalDist = bucketAgg.reduce((s: number, d) => s + d.dist, 0);
  const activePeriods = bucketAgg.filter(d => d.steps > 0).length;

  const cur = metric === 'steps' ? stepsData : metric === 'cal' ? calData : distData;
  const curColor = metric === 'steps' ? '#6366F1' : metric === 'cal' ? '#F59E0B' : '#10B981';
  const curUnit = metric === 'steps' ? '步' : metric === 'cal' ? 'kcal' : 'km';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Avatar.Icon size={36} icon="walk" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>{rangeLabels[range]}活动详情</Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox label="总步数" value={totalSteps.toLocaleString()} color="#6366F1" />
        <SummaryBox label="总消耗" value={`${totalCal}`} unit="kcal" color="#F59E0B" />
        <SummaryBox label="总距离" value={totalDist.toFixed(1)} unit="km" color="#10B981" />
        <SummaryBox label="活跃期" value={`${activePeriods}/${buckets.length}`} color="#EC4899" />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>趋势图</Text>
          </View>
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'steps', label: '步数' },
              { value: 'cal', label: '卡路里' },
              { value: 'dist', label: '距离' },
            ]}
          />
          <BarChart data={cur} color={curColor} unit={curUnit} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>分期明细</Text>
          {buckets.map((b, i) => {
            const agg = bucketAgg[i];
            return (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailDate}>{b.sub}</Text>
                <Text style={styles.detailVal}>
                  {agg.steps > 0
                    ? `${agg.steps.toLocaleString()}步 · ${agg.cal}kcal · ${agg.dist.toFixed(1)}km`
                    : '无数据'}
                </Text>
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// ---------- 训练统计 ----------
function StatsView({ workoutRecords, range }: { workoutRecords: WorkoutRecord[]; range: Range }) {
  const buckets = getBuckets(range);

  const recByBucket = useMemo(() => buckets.map(b =>
    workoutRecords.filter((r: WorkoutRecord) => r.date >= b.start && r.date <= b.end)
  ), [workoutRecords, buckets]);

  const volData: BarChartData[] = buckets.map((b, i) => ({
    label: b.label, value: recByBucket[i].reduce((s: number, r: WorkoutRecord) => s + r.totalVolume, 0),
  }));
  const durData: BarChartData[] = buckets.map((b, i) => ({
    label: b.label, value: recByBucket[i].reduce((s: number, r: WorkoutRecord) => s + r.duration, 0),
  }));

  const all: WorkoutRecord[] = recByBucket.flat();
  const totalVol = all.reduce((s: number, r: WorkoutRecord) => s + r.totalVolume, 0);
  const totalDur = all.reduce((s: number, r: WorkoutRecord) => s + r.duration, 0);
  const totalCnt = all.length;
  const strengthCnt = all.filter(r => r.workoutType === 'strength').length;
  const cardioCnt = all.filter(r => r.workoutType === 'cardio').length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Avatar.Icon size={36} icon="calendar-week" style={styles.headerIcon} color="#10B981" />
        <Text style={styles.title}>{rangeLabels[range]}训练详情</Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox label="训练次数" value={`${totalCnt}`} color="#10B981" />
        <SummaryBox label="总容量" value={(totalVol / 1000).toFixed(1)} unit="k kg" color="#6366F1" />
        <SummaryBox label="总时长" value={`${totalDur}`} unit="分钟" color="#F59E0B" />
        <SummaryBox label="力量/有氧" value={`${strengthCnt}/${cardioCnt}`} color="#8B5CF6" />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>训练容量趋势</Text>
          <BarChart data={volData} color="#6366F1" unit="kg" />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>训练时长趋势</Text>
          <BarChart data={durData} color="#F59E0B" unit="分钟" />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>分期记录</Text>
          {buckets.map((b, i) => {
            const recs = recByBucket[i];
            return (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailDate}>{b.sub}</Text>
                <Text style={styles.detailVal}>
                  {recs.length > 0
                    ? recs.map(r => `${r.workoutType === 'cardio' ? '有氧' : '力量'} ${r.duration}分`).join(' · ')
                    : '休息'}
                </Text>
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// ---------- 肌群分布 ----------
function MuscleDistView({
  workoutRecords, exercises, range,
}: {
  workoutRecords: WorkoutRecord[];
  exercises: Exercise[];
  range: Range;
}) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const { muscleStats, byMuscle, totalHits, maxSets } = useMemo(() => {
    const stats: Record<string, number> = {};
    const byM: Record<string, Record<string, number>> = {};
    workoutRecords.forEach((r: WorkoutRecord) => {
      if (r.status !== 'completed') return;
      r.exercises.forEach(er => {
        const ex = exercises.find(e => e.id === er.exerciseId);
        if (!ex) return;
        const sets = er.sets?.length || 0;
        if (sets === 0) return;
        const hitMuscles = new Set<string>();
        ex.muscleGroup.forEach(raw => {
          const m = MUSCLE_NORMALIZE[raw];
          if (m) hitMuscles.add(m);
        });
        hitMuscles.forEach(m => {
          stats[m] = (stats[m] || 0) + sets;
          if (!byM[m]) byM[m] = {};
          byM[m][ex.name] = (byM[m][ex.name] || 0) + sets;
        });
      });
    });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const mx = Math.max(1, ...Object.values(stats));
    return { muscleStats: stats, byMuscle: byM, totalHits: total, maxSets: mx };
  }, [workoutRecords, exercises]);

  if (totalHits === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Avatar.Icon size={36} icon="chart-pie" style={styles.headerIcon} color="#F59E0B" />
          <Text style={styles.title}>{rangeLabels[range]}肌群分布</Text>
        </View>
        <View style={styles.emptyState}><Text style={styles.emptyText}>{rangeLabels[range]}暂无训练数据</Text></View>
      </ScrollView>
    );
  }

  const sortedMuscles = Object.entries(muscleStats as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const strongest = sortedMuscles[0]!;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Avatar.Icon size={36} icon="chart-pie" style={styles.headerIcon} color="#F59E0B" />
        <Text style={styles.title}>{rangeLabels[range]}肌群分布</Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox label="总组数" value={`${totalHits}`} color="#F59E0B" />
        <SummaryBox label="涉及肌肉" value={`${sortedMuscles.length}`} color="#6366F1" />
        <SummaryBox label="最强肌肉" value={MUSCLE_LABELS[strongest[0]] || strongest[0]} color="#10B981" />
        <SummaryBox label="最弱肌肉" value={sortedMuscles.length >= 2 ? (MUSCLE_LABELS[sortedMuscles[sortedMuscles.length - 1][0]] || '-') : '-'} color="#EF4444" />
      </View>

      {/* 人体热力图 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>人体肌肉热力图</Text>
            <SegmentedControl
              value={side}
              onChange={(v) => setSide(v as 'front' | 'back')}
              options={[
                { value: 'front', label: '正面' },
                { value: 'back', label: '背面' },
              ]}
            />
          </View>
          <BodyMap
            muscleStats={muscleStats}
            maxSets={maxSets}
            side={side}
            selected={selectedMuscle}
            onSelect={(m) => setSelectedMuscle(prev => prev === m ? null : m)}
          />
        </Card.Content>
      </Card>

      {/* 肌肉训练量占比 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>肌肉训练量占比</Text>
          {sortedMuscles.map(([muscle, cnt]) => {
            const pct = ((cnt / totalHits) * 100).toFixed(1);
            const t = cnt / maxSets;
            const color = intensityColor(t);
            const isSel = selectedMuscle === muscle;
            return (
              <TouchableOpacity
                key={muscle}
                activeOpacity={0.7}
                onPress={() => setSelectedMuscle(prev => prev === muscle ? null : muscle)}
                style={[styles.propRow, isSel && styles.propRowSel]}
              >
                <View style={styles.propLabel}>
                  <View style={[styles.propDot, { backgroundColor: color }]} />
                  <Text style={styles.propName}>{MUSCLE_LABELS[muscle] || muscle}</Text>
                </View>
                <View style={styles.propBarTrack}>
                  <View style={[styles.propBarFill, { width: pct + '%' as `${number}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.propPct, { color }]}>{pct}%</Text>
                <Text style={styles.propCnt}>{cnt}组</Text>
              </TouchableOpacity>
            );
          })}
        </Card.Content>
      </Card>

      {/* 各肌肉代表动作 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>各肌肉代表动作 (Top3)</Text>
          {sortedMuscles.map(([muscle]) => {
            const acts = Object.entries(byMuscle[muscle] || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const t = (muscleStats[muscle] || 0) / maxSets;
            const color = intensityColor(t);
            const isSel = selectedMuscle === muscle;
            return (
              <View key={muscle} style={[styles.catBlock, isSel && styles.catBlockSel]}>
                <View style={styles.catHeader}>
                  <View style={[styles.propDot, { backgroundColor: color }]} />
                  <Text style={styles.catTitle}>{MUSCLE_LABELS[muscle] || muscle}</Text>
                  <Text style={styles.catSets}>{muscleStats[muscle]}组</Text>
                </View>
                {acts.length > 0 ? acts.map(([name, sets], i) => (
                  <View key={name} style={styles.actRow}>
                    <Text style={styles.actRank}>{i + 1}</Text>
                    <Text style={styles.actName}>{name}</Text>
                    <Text style={styles.actSets}>{sets}组</Text>
                  </View>
                )) : <Text style={styles.actEmpty}>无记录</Text>}
              </View>
            );
          })}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// ---------- 通用组件 ----------
function SummaryBox({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <View style={[styles.summaryBox, { borderTopColor: color }]}>
      <Text style={styles.summaryValue}>{value}</Text>
      {unit && <Text style={styles.summaryUnit}>{unit}</Text>}
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingBottom: 24 },

  // 头部
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 12 },
  headerIcon: { backgroundColor: '#EEF2FF', marginRight: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },

  // 卡片
  card: { marginBottom: 12, borderRadius: 14, backgroundColor: '#fff', elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  cardHeader: { marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 },

  // 自定义分段控件
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
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },

  // 概览网格
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryBox: {
    width: '48%',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderTopWidth: 3,
    elevation: 1,
  },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  summaryUnit: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  summaryLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },

  // 柱状图
  chartWrap: { alignItems: 'center', paddingVertical: 8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' },
  barCol: { alignItems: 'center', flex: 1, marginHorizontal: 2 },
  barValue: { fontSize: 10, color: '#475569', fontWeight: '600', marginBottom: 4, height: 14 },
  barTrack: { width: 20, height: 130, justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: '500' },
  chartUnit: { fontSize: 11, color: '#94A3B8', marginTop: 10 },

  // 明细行
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  detailDate: { fontSize: 13, color: '#475569', fontWeight: '500' },
  detailVal: { fontSize: 12, color: '#64748B', flex: 1, textAlign: 'right', marginLeft: 12 },

  // ── 人体热力图 ──
  bodyMapWrap: { alignItems: 'center', paddingVertical: 8 },
  bodyFigure: { alignItems: 'center' },
  bodyHead: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#CBD5E1', marginBottom: 2,
  },
  bodyNeck: {
    width: 12, height: 6, borderRadius: 3,
    backgroundColor: '#CBD5E1', marginBottom: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginBottom: 2,
  },
  bodyZone: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1.5,
    paddingVertical: 4,
  },
  bodyZoneSelected: {
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  bodyZoneLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  bodyZoneSets: { fontSize: 10, fontWeight: 'bold', color: '#fff', marginTop: 1 },

  // 图例
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  legendText: { fontSize: 11, color: '#64748B', marginHorizontal: 6 },
  legendBar: { flexDirection: 'row', width: 120, height: 8, borderRadius: 4, overflow: 'hidden' },
  bodyHint: { fontSize: 11, color: '#94A3B8', marginTop: 6, textAlign: 'center' },

  // 比例条
  propRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderRadius: 8, paddingHorizontal: 4 },
  propRowSel: { backgroundColor: '#EEF2FF' },
  propLabel: { flexDirection: 'row', alignItems: 'center', width: 72 },
  propDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  propName: { fontSize: 13, color: '#475569', fontWeight: '500' },
  propBarTrack: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  propBarFill: { height: '100%', borderRadius: 5 },
  propPct: { width: 48, textAlign: 'right', fontSize: 12, fontWeight: 'bold' },
  propCnt: { width: 44, textAlign: 'right', fontSize: 11, color: '#94A3B8', marginLeft: 4 },

  // 各肌肉动作
  catBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 4 },
  catBlockSel: { backgroundColor: '#EEF2FF' },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  catTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  catSets: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  actRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 16 },
  actRank: { width: 20, fontSize: 12, color: '#94A3B8', fontWeight: 'bold' },
  actName: { flex: 1, fontSize: 13, color: '#475569' },
  actSets: { fontSize: 12, color: '#64748B' },
  actEmpty: { fontSize: 12, color: '#94A3B8', paddingLeft: 16, paddingVertical: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
});
