import {
  findFittrackGist,
  createGist,
  getGistContent,
  updateGist,
} from './gist';
import { savePat, getPat, clearPat } from './auth';
import { loadMeta, saveMeta, getDeviceId } from './meta';
import { useAppStore } from '../store';

const SCHEMA_VERSION = 1;
// 上云的字段（currentWorkout / currentCardio 不上云）
const SYNC_FIELDS = [
  'userProfile',
  'exercises',
  'workoutPlans',
  'workoutRecords',
  'dailyActivities',
] as const;

const PUSH_DEBOUNCE_MS = 3000; // 写入后节流 3s 再 push

interface CloudState {
  schemaVersion: number;
  updatedAt: number;
  updatedAtByDevice: string;
  data: Record<string, unknown>;
}

let unsubscribeStore: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedAt = 0; // 防止回环：刚 push 的 updatedAt
let isStarting = false;

// ────────────────────────────────────────────────────────────
// 登录 / 登出
// ────────────────────────────────────────────────────────────

// 登录：保存 PAT → 验证 → 启动同步
export async function login(pat: string): Promise<string> {
  const username = await savePat(pat);
  await saveMeta({ githubUser: username });
  useAppStore.getState().setAuthUser(username);
  await startSync();
  return username;
}

export async function logout(): Promise<void> {
  stopSync();
  await clearPat();
  await saveMeta({
    gistId: null,
    githubUser: null,
    lastSyncedAt: 0,
    lastPulledAt: 0,
  });
  useAppStore.getState().setAuthUser(null);
  useAppStore.getState().setSyncStatus('idle');
}

// ────────────────────────────────────────────────────────────
// 同步生命周期
// ────────────────────────────────────────────────────────────

// 启动同步：确保有 gist → pull → 监听本地写入
export async function startSync(): Promise<void> {
  if (isStarting) return;
  if (!(await getPat())) return;
  isStarting = true;
  useAppStore.getState().setSyncStatus('syncing');

  try {
    const meta = await loadMeta();
    let gistId = meta.gistId;

    // 首次登录：查找或创建 gist
    if (!gistId) {
      gistId = await findFittrackGist();
      if (!gistId) {
        // 新用户：把本地 state 推上去
        const deviceId = await getDeviceId();
        const content = buildPushContent(deviceId);
        const payload: CloudState = JSON.parse(content);
        gistId = await createGist(content);
        lastPushedAt = payload.updatedAt;
        await saveMeta({ gistId, lastSyncedAt: Date.now() });
      } else {
        await saveMeta({ gistId });
      }
    }

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
  const meta = await loadMeta();
  if (!meta.gistId) return false;

  try {
    const content = await getGistContent(meta.gistId);
    if (!content) return false;
    const cloud: CloudState = JSON.parse(content);

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

async function push(): Promise<void> {
  const meta = await loadMeta();
  if (!meta.gistId) return;

  const deviceId = await getDeviceId();
  const content = buildPushContent(deviceId);
  const payload: CloudState = JSON.parse(content);

  useAppStore.getState().setSyncStatus('syncing');
  try {
    await updateGist(meta.gistId, content);
    lastPushedAt = payload.updatedAt;
    await saveMeta({ lastSyncedAt: Date.now() });
    useAppStore.getState().setSyncStatus('idle');
  } catch (e) {
    console.warn('push failed:', e);
    // 离线时不下结论，下次写入或手动同步会重试
    useAppStore.getState().setSyncStatus('error');
    throw e;
  }
}

// 手动「立即同步」：先 pull 再 push
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

function buildPushContent(deviceId: string): string {
  const state = useAppStore.getState();
  const data: Record<string, unknown> = {};
  SYNC_FIELDS.forEach((k) => {
    data[k] = state[k];
  });
  const payload: CloudState = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    updatedAtByDevice: deviceId,
    data,
  };
  return JSON.stringify(payload);
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
  // setState 第二参数 false 表示不替换，是合并
  useAppStore.setState(patch, false);
}
