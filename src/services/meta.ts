import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const META_KEY = 'fitness-tracker-meta';

export interface LocalSyncMeta {
  lastSyncedAt: number;
  lastPulledAt: number;
  deviceId: string;
}

let cachedDeviceId = '';

export async function loadMeta(): Promise<LocalSyncMeta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<LocalSyncMeta>;
      return {
        lastSyncedAt: parsed.lastSyncedAt ?? 0,
        lastPulledAt: parsed.lastPulledAt ?? 0,
        deviceId: parsed.deviceId ?? (await getDeviceId()),
      };
    } catch {
      // 解析失败回退默认值
    }
  }
  const newMeta: LocalSyncMeta = {
    lastSyncedAt: 0,
    lastPulledAt: 0,
    deviceId: await getDeviceId(),
  };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(newMeta));
  return newMeta;
}

export async function saveMeta(patch: Partial<LocalSyncMeta>): Promise<LocalSyncMeta> {
  const current = await loadMeta();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(next));
  return next;
}

// 设备 ID 首次生成后稳定不变（跨登录会话保持）
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const meta = await AsyncStorage.getItem(META_KEY);
  if (meta) {
    try {
      const parsed = JSON.parse(meta) as LocalSyncMeta;
      if (parsed.deviceId) {
        cachedDeviceId = parsed.deviceId;
        return cachedDeviceId;
      }
    } catch {
      // ignore
    }
  }
  cachedDeviceId = Crypto.randomUUID();
  return cachedDeviceId;
}
