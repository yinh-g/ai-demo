import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Button, List, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { loadMeta, LocalSyncMeta } from '../services/meta';
import { syncNow, logout } from '../services/sync';
import { getCurrentUser } from '../services/auth';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises, workoutPlans, syncStatus } = useAppStore();
  const [meta, setMeta] = useState<LocalSyncMeta | null>(null);
  const [syncing, setSyncing] = useState(false);

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 用户信息区域 - 紧凑设计 */}
      <View style={styles.userSection}>
        {userProfile ? (
          <View style={styles.userRow}>
            {userProfile.avatarUri ? (
              <Image source={{ uri: userProfile.avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarCustom, { backgroundColor: userProfile.avatarColor || '#6366F1' }]}>
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
            <Avatar.Icon size={56} icon="account-off" style={styles.avatar} color="#94A3B8" />
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
      </View>

      {/* 统计概览 - 三列紧凑卡片 */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, styles.statCardFirst]}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="dumbbell" style={{ backgroundColor: 'transparent' }} color="#6366F1" />
            <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
            <Text style={styles.statLabel}>完成训练</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="weight-kilogram" style={{ backgroundColor: 'transparent' }} color="#10B981" />
            <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>总容量</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Avatar.Icon size={28} icon="format-list-bulleted" style={{ backgroundColor: 'transparent' }} color="#F59E0B" />
            <Text style={styles.statNumber}>{exercises.length}</Text>
            <Text style={styles.statLabel}>动作数</Text>
          </Card.Content>
        </Card>
      </View>

      {/* 功能列表 */}
      <Card style={styles.menuCard}>
        <List.Section style={styles.menuSection}>
          <List.Item
            title="动作库管理"
            description="查看和管理训练动作"
            left={props => <List.Icon {...props} icon="dumbbell" color="#6366F1" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.menuDivider} />
          <List.Item
            title="身体预测"
            description="增肌减脂预测与身体重组"
            left={props => <List.Icon {...props} icon="trending-up" color="#10B981" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('Prediction')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
          <Divider style={styles.menuDivider} />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account-details" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="chevron-right" color="#CBD5E1" />}
            onPress={() => navigation.navigate('BodyData')}
            style={styles.listItem}
            titleStyle={styles.listTitle}
            descriptionStyle={styles.listDesc}
          />
        </List.Section>
      </Card>

      {/* 云同步卡片 */}
      <Card style={styles.menuCard}>
        <Card.Content>
          <View style={styles.syncHeader}>
            <View style={styles.syncTitleRow}>
              <MaterialCommunityIcons name="cloud-sync-outline" size={20} color="#6366F1" />
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
              {getCurrentUser()?.email || '-'}
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
              icon="logout"
              compact
              textColor="#EF4444"
            >
              退出登录
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
    backgroundColor: '#F8FAFC',
  },
  userSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#EEF2FF',
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
    color: '#1E293B',
  },
  userSubInfo: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  editText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: -4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statCardFirst: {
    marginLeft: 0,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  menuSection: {
    paddingVertical: 4,
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  listDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  menuDivider: {
    marginHorizontal: 16,
    backgroundColor: '#F1F5F9',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 24,
    marginBottom: 32,
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
    color: '#1E293B',
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
    color: '#64748B',
  },
  syncValue: {
    fontSize: 13,
    color: '#1E293B',
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
    borderColor: '#6366F1',
  },
  logoutButton: {
    marginLeft: -8,
  },
});
