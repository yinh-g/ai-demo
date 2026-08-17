import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Button, List, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { loadMeta, LocalSyncMeta } from '../services/meta';
import { syncNow, logout } from '../services/sync';
import { theme, cardStyle, cardSpacing, pagePadding } from '../theme';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises, workoutPlans, syncStatus, isGuest, setIsGuest, authUser, setAuthUser } = useAppStore();
  const [meta, setMeta] = useState<LocalSyncMeta | null>(null);
  const [syncing, setSyncing] = useState(false);

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

  // 本周/本月训练进度
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 29); monthStart.setHours(0, 0, 0, 0);
  const weekWorkouts = completedWorkouts.filter(r => new Date(r.date).getTime() >= weekStart.getTime()).length;
  const monthWorkouts = completedWorkouts.filter(r => new Date(r.date).getTime() >= monthStart.getTime()).length;
  const WEEKLY_GOAL = 4;
  const MONTHLY_GOAL = 16;

  const refreshMeta = async () => {
    setMeta(await loadMeta());
  };

  useEffect(() => {
    refreshMeta();
  }, []);

  const getGenderLabel = (gender?: string) => {
    return gender === 'male' ? '男' : gender === 'female' ? '女' : '';
  };

  const formatSyncTime = (ts: number) => {
    if (!ts) return '从未';
    const diff = Date.now() - ts;
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getSyncStatusLabel = () => {
    if (syncing) return '同步中...';
    switch (syncStatus) {
      case 'syncing': return '同步中';
      case 'error': return '同步失败';
      case 'offline': return '离线';
      default: return '已连接';
    }
  };

  const getSyncStatusColor = () => {
    if (syncing) return '#F59E0B';
    switch (syncStatus) {
      case 'error': return '#EF4444';
      case 'offline': return '#94A3B8';
      default: return '#10B981';
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      await refreshMeta();
    } catch (e: any) {
      Alert.alert('同步失败', e?.message || '请检查网络后重试');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    if (isGuest) {
      Alert.alert(
        '登录账号',
        '登录后可同步数据到云端，换设备不丢失。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '去登录',
            onPress: () => {
              setIsGuest(false);
              setAuthUser(null);
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      '退出登录',
      '退出后本地数据保留，但将不再同步到云端。确定退出吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // logout 会清空 store.authUser，App.tsx 订阅后自动回到登录页
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, pagePadding]} showsVerticalScrollIndicator={false}>
      {/* 用户信息卡片 */}
      <Card style={[styles.card, styles.userCard]}>
        <Card.Content>
          {userProfile ? (
            <View style={styles.userRow}>
              {userProfile.avatarUri ? (
                <Image source={{ uri: userProfile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarCustom, { backgroundColor: userProfile.avatarColor || theme.colors.primary }]}>
                  <Text style={styles.avatarLetter}>
                    {(userProfile.nickname || getGenderLabel(userProfile.gender)).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userMeta}>
                <Text style={styles.userMainInfo}>
                  {userProfile.nickname || '训练者'}
                </Text>
                <Text style={styles.userSubInfo}>
                  {getGenderLabel(userProfile.gender)} · {userProfile.age}岁 · {userProfile.weight}kg · 训练{userProfile.trainingYears}年
                </Text>
              </View>
              <Button
                mode="text"
                onPress={() => navigation.navigate('BodyData')}
                labelStyle={styles.editText}
                icon="pencil"
                compact
              >
                编辑
              </Button>
            </View>
          ) : (
            <View style={styles.userRow}>
              <Avatar.Icon size={56} icon="account-off" style={styles.avatar} color={theme.colors.textTertiary} />
              <View style={styles.userMeta}>
                <Text style={styles.userMainInfo}>尚未设置身体数据</Text>
                <Text style={styles.userSubInfo}>设置后可查看预测和建议</Text>
              </View>
              <Button
                mode="text"
                onPress={() => navigation.navigate('BodyData')}
                labelStyle={styles.editText}
                icon="pencil"
                compact
              >
                设置
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* 目标进度 */}
      <View style={styles.statsRow}>
        <Card style={[styles.miniCard]}>
          <Card.Content style={styles.miniCardContent}>
            <Avatar.Icon size={28} icon="calendar-week" style={{ backgroundColor: 'transparent' }} color={theme.colors.primary} />
            <Text style={styles.miniNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {weekWorkouts}/{WEEKLY_GOAL}
            </Text>
            <Text style={styles.miniLabel}>本周训练</Text>
            <View style={styles.miniProgressTrack}>
              <View style={[styles.miniProgressFill, { width: `${Math.min(weekWorkouts / WEEKLY_GOAL, 1) * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          </Card.Content>
        </Card>
        <Card style={[styles.miniCard]}>
          <Card.Content style={styles.miniCardContent}>
            <Avatar.Icon size={28} icon="calendar-month" style={{ backgroundColor: 'transparent' }} color={theme.colors.success} />
            <Text style={styles.miniNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {monthWorkouts}/{MONTHLY_GOAL}
            </Text>
            <Text style={styles.miniLabel}>本月训练</Text>
            <View style={styles.miniProgressTrack}>
              <View style={[styles.miniProgressFill, { width: `${Math.min(monthWorkouts / MONTHLY_GOAL, 1) * 100}%`, backgroundColor: theme.colors.success }]} />
            </View>
          </Card.Content>
        </Card>
        <Card style={[styles.miniCard]}>
          <Card.Content style={styles.miniCardContent}>
            <Avatar.Icon size={28} icon="format-list-bulleted" style={{ backgroundColor: 'transparent' }} color={theme.colors.warning} />
            <Text style={styles.miniNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {workoutPlans.length}
            </Text>
            <Text style={styles.miniLabel}>训练计划</Text>
            <View style={styles.miniProgressTrack}>
              <View style={[styles.miniProgressFill, { width: workoutPlans.length > 0 ? '100%' : '0%', backgroundColor: theme.colors.warning }]} />
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* 功能列表 */}
      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="动作库管理"
            description="查看和管理训练动作"
            left={props => <List.Icon {...props} icon="dumbbell" color={theme.colors.primary} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textTertiary} />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.listDivider} />
          <List.Item
            title="身体预测"
            description="增肌减脂预测与身体重组"
            left={props => <List.Icon {...props} icon="trending-up" color={theme.colors.success} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textTertiary} />}
            onPress={() => navigation.navigate('Prediction')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.listDivider} />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account-details" color={theme.colors.warning} />}
            right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.textTertiary} />}
            onPress={() => navigation.navigate('BodyData')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
        </List.Section>
      </Card>

      {/* 云同步卡片 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.syncHeader}>
            <View style={styles.syncTitleRow}>
              <MaterialCommunityIcons name="cloud-sync-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.syncTitle}>云同步</Text>
            </View>
            <View style={[styles.syncBadge, { backgroundColor: getSyncStatusColor() + '20' }]}>
              <View style={[styles.syncDot, { backgroundColor: getSyncStatusColor() }]} />
              <Text style={[styles.syncBadgeText, { color: getSyncStatusColor() }]}>
                {getSyncStatusLabel()}
              </Text>
            </View>
          </View>

          <View style={styles.syncInfoRow}>
            <Text style={styles.syncLabel}>账号</Text>
            <Text style={styles.syncValue} numberOfLines={1}>
              {isGuest ? '游客模式（数据仅本地保存）' : (authUser || '-')}
            </Text>
          </View>
          <View style={styles.syncInfoRow}>
            <Text style={styles.syncLabel}>最近同步</Text>
            <Text style={styles.syncValue}>{formatSyncTime(meta?.lastSyncedAt ?? 0)}</Text>
          </View>

          <View style={styles.syncButtonRow}>
            <Button
              mode="outlined"
              onPress={handleSync}
              loading={syncing}
              disabled={syncing}
              style={styles.syncButton}
              icon="refresh"
              compact
            >
              立即同步
            </Button>
            <Button
              mode="text"
              onPress={handleLogout}
              style={styles.logoutButton}
              icon={isGuest ? "login" : "logout"}
              compact
              textColor={isGuest ? theme.colors.primary : theme.colors.danger}
            >
              {isGuest ? '登录账号' : '退出登录'}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 版本信息 */}
      <Text style={styles.version}>FitTrack v1.0</Text>
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
    marginBottom: cardSpacing.marginBottom,
  },
  userCard: {
    ...cardStyle,
    marginBottom: cardSpacing.marginBottom,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.primaryLight,
  },
  avatarCustom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userMeta: {
    flex: 1,
    marginLeft: 12,
  },
  userMainInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userSubInfo: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  editText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: -4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: cardSpacing.marginBottom,
  },
  miniCard: {
    ...cardStyle,
    flex: 1,
    marginBottom: 0,
  },
  miniCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  miniNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 6,
    includeFontPadding: false,
  },
  miniLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  miniProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  listItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  listDesc: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  listDivider: {
    marginHorizontal: 4,
    backgroundColor: theme.colors.border,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 24,
    marginBottom: 16,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  syncInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  syncLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  syncValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  syncButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  syncButton: {
    borderRadius: 8,
    borderColor: theme.colors.primary,
  },
  logoutButton: {
    marginLeft: -8,
  },
});
