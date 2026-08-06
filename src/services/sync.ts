import { readCloudState, writeCloudState, CloudState } from './firestore';
import { login as firebaseLogin, register as firebaseRegister, logoutFirebase, getCurrentUser, User } from './auth';
import { getDeviceId, loadMeta, saveMeta } from './meta';
import { useAppStore } from '../store';

const SCHEMA_VERSION = 1;
const SYNC_FIELDS = [
  'userProfile',
  'exercises',
  'workoutPlans',
  'workoutRecords',
  'dailyActivities',
] as const;

const PUSH_DEBOUNCE_MS = 3000;

type SyncFieldKey = typeof SYNC_FIELDS[number];

let unsubscribeStore: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedAt = 0;
let isStarting = false;
let authUnsub: (() => void) | null = null;

// ────────────────────────────────────────────────────────────
// 登录 / 注册 / 登出
// ────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const user = await firebaseLogin(email, password);
  useAppStore.getState().setAuthUser(user.email || user.uid);
  await startSync();
  return user;
}

export async function register(email: string, password: string): Promise<User> {
  const user = await firebaseRegister(email, password);
  useAppStore.getState().setAuthUser(user.email || user.uid);
  // 新用户：把本地现有数据作为种子写入云端（如果本地有数据的话）
  try {
    const existing = await readCloudState();
    if (!existing) {
      await push(true);
    }
  } catch {
    // 新注册首次写入云端失败不致命，startSync 会重试
  }
  await startSync();
  return user;
}

export async function logout(): Promise<void> {
  stopSync();
  if (authUnsub) {
    authUnsub();
    authUnsub = null;
  }
  await logoutFirebase();
  await saveMeta({
    lastSyncedAt: 0,
    lastPulledAt: 0,
  });
  useAppStore.getState().setAuthUser(null);
  useAppStore.getState().setSyncStatus('idle');
}

// ────────────────────────────────────────────────────────────
// 同步生命周期
// ────────────────────────────────────────────────────────────

export async function startSync(): Promise<void> {
  if (isStarting) return;
  if (!getCurrentUser()) return;
  isStarting = true;
  useAppStore.getState().setSyncStatus('syncing');

  try {
    // 拉取云端最新
    await pullNow();

    // 监听本地 store 变化（节流 push）
    if (!unsubscribeStore) {
      unsubscribeStore = useAppStore.subscribe(() => schedulePush());
    }

    useAppStore.getState().setSyncStatus('idle');
  } catch (e) {
    console.warn('startSync failed:', e);
    useAppStore.getState().setSyncStatus('error');
  } finally {
    isStarting = false;
  }
}

export function stopSync(): void {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

// ────────────────────────────────────────────────────────────
// Pull：云端 → 本地
// ────────────────────────────────────────────────────────────

export async function pullNow(): Promise<boolean> {
  if (!getCurrentUser()) return false;

  try {
    const cloud = await readCloudState();
    if (!cloud) {
      // 云端还没数据：如果本地有数据则 push 种子
      const state = useAppStore.getState();
      const hasLocalData = SYNC_FIELDS.some((k) => {
        const v = (state as any)[k];
        return Array.isArray(v) ? v.length > 0 : v != null;
      });
      if (hasLocalData) {
        await push(true);
      }
      return false;
    }

    const meta = await loadMeta();
    // 防回环：自己刚 push 的，跳过
    if (cloud.updatedAt === lastPushedAt) return false;
    // 旧数据：云端不比本地新
    if (cloud.updatedAt <= meta.lastPulledAt) return false;

    mergeCloudToLocal(cloud.data);
    await saveMeta({ lastPulledAt: cloud.updatedAt });
    return true;
  } catch (e) {
    console.warn('pullNow failed:', e);
    useAppStore.getState().setSyncStatus('error');
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// Push：本地 → 云端（节流）
// ────────────────────────────────────────────────────────────

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    push().catch((e) => console.warn('push failed:', e));
  }, PUSH_DEBOUNCE_MS);
}

async function push(force = false): Promise<void> {
  if (!force && !getCurrentUser()) return;

  const deviceId = await getDeviceId();
  const payload = buildPayload(deviceId);

  useAppStore.getState().setSyncStatus('syncing');
  try {
    await writeCloudState(payload);
    lastPushedAt = payload.updatedAt;
    await saveMeta({ lastSyncedAt: Date.now() });
    useAppStore.getState().setSyncStatus('idle');
  } catch (e) {
    console.warn('push failed:', e);
    useAppStore.getState().setSyncStatus('error');
    throw e;
  }
}

export async function syncNow(): Promise<void> {
  useAppStore.getState().setSyncStatus('syncing');
  try {
    await pullNow();
    await push();
    useAppStore.getState().setSyncStatus('idle');
  } catch (e) {
    useAppStore.getState().setSyncStatus('error');
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// 内部工具
// ────────────────────────────────────────────────────────────

function buildPayload(deviceId: string): CloudState {
  const state = useAppStore.getState();
  const data: Record<string, unknown> = {};
  SYNC_FIELDS.forEach((k) => {
    data[k] = (state as any)[k];
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    updatedAtByDevice: deviceId,
    data,
  };
}

function mergeCloudToLocal(cloudData: Record<string, unknown>): void {
  const store = useAppStore.getState();
  const patch: Record<string, unknown> = {};
  SYNC_FIELDS.forEach((k) => {
    if (cloudData[k] !== undefined) patch[k] = cloudData[k];
  });
  // 保留本地进行中的训练
  patch.currentWorkout = store.currentWorkout;
  patch.currentCardio = store.currentCardio;
  useAppStore.setState(patch, false);
}
