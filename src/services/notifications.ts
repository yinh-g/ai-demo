import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'weight-reminders';

// 通知展示行为（不设置则通知不会显示）
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '体重记录提醒',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// 请求通知权限（iOS 细粒度、Android 13+ 需先建渠道）
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureAndroidChannel();

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (Platform.OS === 'ios' && settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted ||
    (Platform.OS === 'ios' && req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
  );
}

// 安排每周提醒（weekday: 1=周日 ... 2=周一 ... 7=周六）
export async function scheduleWeightReminder(opts: { hour?: number; weekday?: number } = {}): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '记录一下今天的体重',
      body: '定期记录体重能让增肌/减脂预测越来越准',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: opts.weekday ?? 2, // 默认周一
      hour: opts.hour ?? 8,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });

  return true;
}

export async function cancelWeightReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function isReminderScheduled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length > 0;
}
