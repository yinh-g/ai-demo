import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Dialog, Avatar } from 'react-native-paper';
import { useAppStore } from '../store';
import { CardioActivity } from '../types';

const activityLabels: Record<CardioActivity, string> = {
  running: '跑步',
  cycling: '骑行',
  incline_walk: '爬坡',
  rowing: '划船',
};

const activityIcons: Record<CardioActivity, string> = {
  running: 'run',
  cycling: 'bike',
  incline_walk: 'terrain',
  rowing: 'rowing',
};

const activityColors: Record<CardioActivity, string> = {
  running: '#10B981',
  cycling: '#3B82F6',
  incline_walk: '#F59E0B',
  rowing: '#8B5CF6',
};

const MET_VALUES: Record<CardioActivity, number> = {
  running: 9.8,
  cycling: 7.5,
  incline_walk: 6.0,
  rowing: 7.0,
};

export default function CardioSessionScreen({ navigation, route }: any) {
  const { activity } = route.params || { activity: 'running' as CardioActivity };
  const { currentCardio, endCardio, cancelCardio, userProfile } = useAppStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState('');
  const [avgHeartRate, setAvgHeartRate] = useState('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const color = activityColors[activity];
  const label = activityLabels[activity];
  const icon = activityIcons[activity];

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIsPaused((paused) => {
        if (!paused) {
          setElapsedTime((prev) => prev + 1);
        }
        return paused;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCalories = () => {
    const weight = userProfile?.weight || 70;
    const durationHours = elapsedTime / 3600;
    const met = MET_VALUES[activity];
    return Math.round(met * weight * durationHours);
  };

  const calculatePace = () => {
    const dist = parseFloat(distance);
    if (!dist || elapsedTime <= 0) return '--';
    const paceSeconds = elapsedTime / dist;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleEnd = () => {
    setShowEndDialog(true);
  };

  const confirmEnd = () => {
    const dist = parseFloat(distance) || undefined;
    const cals = calculateCalories();
    endCardio({
      duration: elapsedTime,
      distance: dist,
      calories: cals,
    });
    setShowEndDialog(false);
    navigation.goBack();
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    cancelCardio();
    setShowCancelDialog(false);
    navigation.goBack();
  };

  const calories = calculateCalories();

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Button
          mode="text"
          textColor="#EF4444"
          onPress={handleCancel}
          labelStyle={{ fontSize: 13 }}
          icon="close"
        >
          放弃
        </Button>
        <View style={styles.headerCenter}>
          <Avatar.Icon size={24} icon={icon} style={{ backgroundColor: 'transparent' }} color={color} />
          <Text style={[styles.headerTitle, { color }]}>{label}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 大计时器 */}
        <View style={styles.timerSection}>
          <Text style={[styles.timer, { color }]}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.timerLabel}>{isPaused ? '已暂停' : '进行中'}</Text>
        </View>

        {/* 数据面板 */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Avatar.Icon size={24} icon="map-marker-distance" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
              <Text style={styles.statValue}>{distance || '0'}</Text>
              <Text style={styles.statUnit}>km</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Avatar.Icon size={24} icon="fire" style={{ backgroundColor: 'transparent' }} color="#F59E0B" />
              <Text style={styles.statValue}>{calories}</Text>
              <Text style={styles.statUnit}>kcal</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Avatar.Icon size={24} icon="speedometer" style={{ backgroundColor: 'transparent' }} color="#10B981" />
              <Text style={styles.statValue}>{calculatePace()}</Text>
              <Text style={styles.statUnit}>配速</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Avatar.Icon size={24} icon="heart-pulse" style={{ backgroundColor: 'transparent' }} color="#EF4444" />
              <Text style={styles.statValue}>{avgHeartRate || '--'}</Text>
              <Text style={styles.statUnit}>bpm</Text>
            </Card.Content>
          </Card>
        </View>

        {/* 手动输入 */}
        <Card style={styles.inputCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Avatar.Icon size={20} icon="pencil" style={styles.sectionIcon} color="#6366F1" />
              <Text style={styles.sectionTitle}>手动记录</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                label="距离 (km)"
                value={distance}
                onChangeText={setDistance}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
                left={<TextInput.Icon icon="map-marker-distance" color="#94A3B8" />}
              />
              <TextInput
                label="平均心率"
                value={avgHeartRate}
                onChangeText={setAvgHeartRate}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#6366F1"
                left={<TextInput.Icon icon="heart-pulse" color="#94A3B8" />}
              />
            </View>
          </Card.Content>
        </Card>

        {/* 控制按钮 */}
        <View style={styles.controls}>
          {isPaused ? (
            <Button
              mode="contained"
              onPress={handleResume}
              style={[styles.controlButton, { backgroundColor: color }]}
              labelStyle={styles.controlButtonLabel}
              icon="play"
            >
              继续
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={handlePause}
              style={[styles.controlButton, { borderColor: color, borderWidth: 2 }]}
              labelStyle={[styles.controlButtonLabel, { color }]}
              icon="pause"
              textColor={color}
            >
              暂停
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleEnd}
            style={[styles.controlButton, styles.endButton]}
            labelStyle={styles.controlButtonLabel}
            icon="flag-checkered"
          >
            结束训练
          </Button>
        </View>
      </ScrollView>

      {/* 结束确认弹窗 */}
      <Portal>
        <Dialog visible={showEndDialog} onDismiss={() => setShowEndDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>结束训练</Dialog.Title>
          <Dialog.Content>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>时长</Text>
              <Text style={styles.summaryValue}>{formatTime(elapsedTime)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>距离</Text>
              <Text style={styles.summaryValue}>{distance || '0'} km</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>消耗</Text>
              <Text style={styles.summaryValue}>{calories} kcal</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEndDialog(false)} textColor="#64748B">取消</Button>
            <Button onPress={confirmEnd} mode="contained" style={{ borderRadius: 8, backgroundColor: color }}>
              确认结束
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 放弃确认弹窗 */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>放弃训练</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.cancelText}>确定要放弃本次训练吗？已记录的数据将不会保存。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)} textColor="#64748B">继续训练</Button>
            <Button onPress={confirmCancel} mode="contained" style={{ borderRadius: 8, backgroundColor: '#EF4444' }}>
              确认放弃
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  timer: {
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 6,
  },
  statUnit: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  inputCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  controlButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  controlButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: '#6366F1',
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  cancelText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
});
