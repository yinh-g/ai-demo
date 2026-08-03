import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, List, Divider, Avatar, Portal, Dialog } from 'react-native-paper';
import { useAppStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }: any) {
  const { userProfile, workoutRecords, exercises, workoutPlans } = useAppStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  const completedWorkouts = workoutRecords.filter(r => r.status === 'completed');
  const totalVolume = completedWorkouts.reduce((sum, r) => sum + r.totalVolume, 0);

  const handleExport = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      const backup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: stores.reduce((acc, [key, value]) => {
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>)
      };
      const jsonStr = JSON.stringify(backup, null, 2);
      
      // Web环境使用clipboard，移动端使用分享或提示
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(jsonStr);
          Alert.alert('导出成功', '备份数据已复制到剪贴板，请保存到安全位置');
        } else {
          // React Native 环境：显示数据让用户手动复制
          Alert.alert(
            '导出成功',
            '备份数据已生成（共 ' + jsonStr.length + ' 字符）。由于移动端限制，请使用下方导入功能在同一设备恢复，或截图保存。',
            [{ text: '确定' }]
          );
        }
      } catch (clipboardError) {
        Alert.alert(
          '导出成功',
          '备份数据已生成（共 ' + jsonStr.length + ' 字符）。由于移动端限制，请使用下方导入功能在同一设备恢复，或截图保存。',
          [{ text: '确定' }]
        );
      }
    } catch (error) {
      Alert.alert('导出失败', '备份数据时出错，请重试');
    }
  };

  const handleImport = async () => {
    try {
      if (!importData.trim()) {
        Alert.alert('错误', '请输入备份数据');
        return;
      }

      const backup = JSON.parse(importData.trim());
      if (!backup.data || typeof backup.data !== 'object') {
        Alert.alert('错误', '备份数据格式不正确');
        return;
      }

      // 确认导入
      Alert.alert(
        '确认导入',
        '导入将覆盖当前所有数据，确定继续吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: async () => {
              try {
                const entries = Object.entries(backup.data).map(([key, value]) => [key, value as string]);
                await AsyncStorage.multiSet(entries);
                Alert.alert(
                  '导入成功',
                  '数据已恢复，请重启应用以生效',
                  [
                    { text: '确定' }
                  ]
                );
                setShowImportDialog(false);
                setImportData('');
              } catch (e) {
                Alert.alert('导入失败', '恢复数据时出错');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('错误', '备份数据格式不正确，请检查');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={40} icon="account" style={styles.headerIcon} color="#6366F1" />
        <Text style={styles.title}>我的</Text>
      </View>

      {/* 用户信息卡片 */}
      <Card style={[styles.card, styles.userCard]}>
        <Card.Content>
          {userProfile ? (
            <>
              <View style={styles.userHeader}>
                <Avatar.Icon 
                  size={64} 
                  icon={userProfile.gender === 'male' ? 'face-man' : 'face-woman'} 
                  style={styles.avatar}
                  color="#fff"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {userProfile.age}岁 · {userProfile.weight}kg
                  </Text>
                  <Text style={styles.userSubtitle}>
                    训练年限: {userProfile.trainingYears}年
                  </Text>
                </View>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>蛋白质</Text>
                  <Text style={styles.detailValue}>{userProfile.proteinIntake}g/kg</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>睡眠</Text>
                  <Text style={styles.detailValue}>{userProfile.sleepHours}小时</Text>
                </View>
                {userProfile.muscleGainGoal && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>目标</Text>
                    <Text style={styles.detailValue}>{userProfile.muscleGainGoal}kg</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noProfile}>
              <Avatar.Icon size={64} icon="account-off" style={styles.avatar} color="#fff" />
              <Text style={styles.noProfileText}>尚未设置身体数据</Text>
            </View>
          )}
          <Button
            mode="contained"
            onPress={() => navigation.navigate('BodyData')}
            style={styles.editButton}
            labelStyle={styles.editButtonLabel}
            icon="pencil"
          >
            {userProfile ? '编辑身体数据' : '设置身体数据'}
          </Button>
        </Card.Content>
      </Card>

      {/* 统计概览 */}
      <Card style={[styles.card, styles.statsCard]}>
        <Card.Content>
          <Text style={styles.sectionTitle}>训练统计</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, styles.statItemBorder]}>
              <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
              <Text style={styles.statLabel}>完成训练</Text>
            </View>
            <View style={[styles.statItem, styles.statItemBorder]}>
              <Text style={styles.statNumber}>{(totalVolume / 1000).toFixed(1)}k</Text>
              <Text style={styles.statLabel}>总容量(kg)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{exercises.length}</Text>
              <Text style={styles.statLabel}>动作数量</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 功能列表 */}
      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="动作库管理"
            description="查看和管理训练动作"
            left={props => <List.Icon {...props} icon="dumbbell" color="#6366F1" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ExerciseLibrary')}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="身体预测"
            description="增肌减脂预测与身体重组"
            left={props => <List.Icon {...props} icon="trending-up" color="#10B981" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Prediction')}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="身体数据"
            description="设置体重、年龄、目标等"
            left={props => <List.Icon {...props} icon="account-details" color="#F59E0B" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('BodyData')}
            style={styles.listItem}
          />
        </List.Section>
      </Card>

      {/* 数据备份 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Avatar.Icon size={20} icon="database" style={styles.sectionIcon} color="#6366F1" />
            <Text style={styles.sectionTitle}>数据备份</Text>
          </View>
          <Text style={styles.backupDesc}>
            导出备份数据以防止卸载应用后数据丢失。导入将覆盖当前所有数据。
          </Text>
          <View style={styles.backupButtons}>
            <Button
              mode="outlined"
              onPress={handleExport}
              style={styles.backupButton}
              labelStyle={styles.backupButtonLabel}
              icon="export"
              textColor="#6366F1"
            >
              导出备份
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowImportDialog(true)}
              style={[styles.backupButton, { backgroundColor: '#6366F1' }]}
              labelStyle={styles.backupButtonLabel}
              icon="import"
            >
              导入恢复
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 导入弹窗 */}
      <Portal>
        <Dialog visible={showImportDialog} onDismiss={() => setShowImportDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>导入备份数据</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.importWarning}>
              导入将覆盖当前所有数据，请确保已备份当前数据。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowImportDialog(false)} textColor="#64748B">取消</Button>
            <Button onPress={handleImport} mode="contained" style={{ borderRadius: 8, backgroundColor: '#6366F1' }}>
              确认导入
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
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
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    backgroundColor: '#fff',
  },
  userCard: {
    backgroundColor: '#6366F1',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  noProfile: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProfileText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  editButtonLabel: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statItemBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  listItem: {
    paddingVertical: 8,
  },
  backupDesc: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  backupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backupButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  backupButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialog: {
    borderRadius: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  importWarning: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
  },
});
