import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const META_KEY = 'fitness-tracker-meta';

export interface LocalSyncMeta {
  gistId: string | null;        // Gist ID，首次同步后保存
  lastSyncedAt: number;         // 上次成功 push 到云端的时间
  lastPulledAt: number;         // 上次从云端 pull 的时间（用 cloud.updatedAt 比对）
  deviceId: string;             // 设备唯一 ID
  githubUser: string | null;    // GitHub 用户名（UI 显示）
}

let cachedDeviceId = '';

export async function loadMeta(): Promise<LocalSyncMeta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<LocalSyncMeta>;
      // 确保 deviceId 必定存在（旧数据可能没有）
      return {
        gistId: parsed.gistId ?? null,
        lastSyncedAt: parsed.lastSyncedAt ?? 0,
        lastPulledAt: parsed.lastPulledAt ?? 0,
        deviceId: parsed.deviceId ?? (await getDeviceId()),
        githubUser: parsed.githubUser ?? null,
      };
    } catch {
      // 解析失败回退默认值
    }
  }
  const newMeta: LocalSyncMeta = {
    gistId: null,
    lastSyncedAt: 0,
    lastPulledAt: 0,
    deviceId: await getDeviceId(),
    githubUser: null,
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

// 设备 ID 首次生成后稳定不变
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
