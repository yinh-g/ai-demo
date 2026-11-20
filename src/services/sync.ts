import { readCloudState, writeCloudState, CloudState } from './firestore';
import { login as supabaseLogin, register as supabaseRegister, logoutSupabase, getCurrentUser, User } from './auth';
import { getDeviceId, loadMeta, saveMeta } from './meta';
import { useAppStore } from '../store';

const SCHEMA_VERSION = 1;
const SYNC_FIELDS = [
  'userProfile',
  'exercises',
  'workoutPlans',
  'workoutRecords',
  'dailyActivities',
  'foodLogs',
  'bodyMeasurements',
  'predictionSnapshots',
  'calibration',
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
  const user = await supabaseLogin(email, password);
  useAppStore.getState().setAuthUser(user.email || user.id);
  await startSync();
  return user;
}

export async function register(email: string, password: string): Promise<User> {
  const user = await supabaseRegister(email, password);
  useAppStore.getState().setAuthUser(user.email || user.id);
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
  await logoutSupabase();
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
  const user = await getCurrentUser();
  if (!user) return;
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
  const user = await getCurrentUser();
  if (!user) return false;

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
  if (!force) {
    const user = await getCurrentUser();
    if (!user) return;
  }

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

  // 特殊处理 exercises：合并时确保去重
  if (cloudData.exercises !== undefined) {
    const cloudExercises = cloudData.exercises as any[];
    const localExercises = store.exercises as any[];
    // 以云端数据为基础，补充本地独有的（按id去重）
    const cloudIds = new Set(cloudExercises.map(e => e.id));
    const localOnly = localExercises.filter(e => !cloudIds.has(e.id));
    // 合并并按名称去重（保留第一个出现的）
    const merged = [...cloudExercises, ...localOnly];
    const seen = new Set<string>();
    const deduped = merged.filter(e => {
      const key = e.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    patch.exercises = deduped;
  }

  // 身体测量：按日期并集，同一天保留较新记录
  if (cloudData.bodyMeasurements !== undefined) {
    const cloud = (cloudData.bodyMeasurements as any[]) || [];
    const byDate = new Map<string, any>();
    [...cloud, ...(store.bodyMeasurements as any[])].forEach((m) => {
      const cur = byDate.get(m.date);
      if (!cur || (m.createdAt || 0) > (cur.createdAt || 0)) byDate.set(m.date, m);
    });
    patch.bodyMeasurements = Array.from(byDate.values());
  }

  // 预测快照：按日期并集，保留最近 60 条
  if (cloudData.predictionSnapshots !== undefined) {
    const cloud = (cloudData.predictionSnapshots as any[]) || [];
    const byDate = new Map<string, any>();
    [...cloud, ...(store.predictionSnapshots as any[])].forEach((s) => {
      const cur = byDate.get(s.date);
      if (!cur || (s.createdAt || 0) > (cur.createdAt || 0)) byDate.set(s.date, s);
    });
    patch.predictionSnapshots = Array.from(byDate.values())
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 60);
  }

  // 校准状态：取 updatedAt 较新者
  if (cloudData.calibration !== undefined) {
    const cloud = cloudData.calibration as any;
    const local = store.calibration as any;
    if (!local) patch.calibration = cloud;
    else if (!cloud) patch.calibration = local;
    else patch.calibration = (cloud.updatedAt || 0) > (local.updatedAt || 0) ? cloud : local;
  }

  const mergedFields = new Set(['exercises', 'bodyMeasurements', 'predictionSnapshots', 'calibration']);
  SYNC_FIELDS.forEach((k) => {
    if (!mergedFields.has(k) && cloudData[k] !== undefined) patch[k] = cloudData[k];
  });

  // 保留本地进行中的训练
  patch.currentWorkout = store.currentWorkout;
  patch.currentCardio = store.currentCardio;
  useAppStore.setState(patch, false);
}
