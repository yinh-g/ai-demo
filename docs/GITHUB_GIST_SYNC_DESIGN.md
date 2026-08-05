# FitTrack GitHub Gist 云同步设计文档

> 版本：v1.0  日期：2026-08-05
> 评审状态：待评审

---

## 1. 项目背景与目标

### 1.1 现状

FitTrack 是基于 **Expo SDK 57 + React Native 0.86 + Zustand 5** 的健身追踪应用，数据层现状：

- 所有业务数据存于 [src/store/index.ts](file:///workspace/src/store/index.ts) 的 Zustand store
- 通过 `zustand/middleware` 的 `persist` 中间件持久化到 `AsyncStorage`
- 持久化 key：`fitness-tracker-storage`，单 JSON 文档
- 无用户体系、无服务端、无跨设备同步能力

### 1.2 目标

接入 GitHub Gist 实现：

1. **用户体系**：基于 GitHub Personal Access Token (PAT) 鉴权
2. **云同步**：登录后本地数据同步到 GitHub Gist，多设备可见
3. **离线优先**：断网可正常使用，联网后自动同步
4. **最小侵入**：不破坏现有 `expo start` 工作流，不 eject
5. **国内可用**：不依赖 Firebase/Google 服务，GitHub 国内可访问

### 1.3 非目标

- 不做多人协作/分享
- 不做端到端加密（Gist 本身是 secret，传输走 HTTPS）
- 不做实时同步（Gist API 无 webhook 给客户端）
- 不替换 AsyncStorage 作为本地存储介质

### 1.4 与 Firebase 方案对比

| 维度 | Firebase | GitHub Gist（本方案） |
|---|---|---|
| 鉴权 | Firebase Auth | GitHub PAT |
| 存储 | Firestore 文档 | Gist 文件 |
| 实时监听 | onSnapshot | ❌ 无，改轮询 |
| 离线队列 | SDK 自带 | 自己实现 |
| 冲突解决 | LWW | LWW |
| 控制台配置 | 需要 | 不需要 |
| 国内访问 | ❌ | ✅ |
| 速率限制 | 20K/天写 | 5000/小时（认证） |
| 依赖包 | firebase + expo-crypto | 仅 expo-secure-store |

---

## 2. GitHub 准备指引

### 2.1 生成 Personal Access Token (PAT)

1. 登录 https://github.com/settings/tokens （用户已有 `yinh-g` 账号）
2. **Generate new token** → **Generate new token (classic)**
3. 配置：
   - **Note**：`fittrack-sync`
   - **Expiration**：建议 90 天（到期可重新生成）
   - **Scopes**：只勾选 `gist`（仅访问 Gist 权限，最小权限原则）
4. **Generate token** → 复制 token（形如 `ghp_xxxxxxxxxxxx`）
5. ⚠️ Token 只显示一次，丢失需重新生成

> 这个 token 只能读写你的 Gist，无法访问代码仓库、无法修改账号设置，权限最小。

### 2.2 验证 Token

```bash
curl -H "Authorization: token ghp_xxxx" https://api.github.com/user
```

返回用户信息即有效。

### 2.3 Gist 创建时机

应用首次登录时自动创建，**不需用户手动建 Gist**。流程见 5.2。

---

## 3. 技术选型与理由

### 3.1 选 GitHub Gist，不选 Firebase

- ✅ 用户已有 GitHub 账号，零注册成本
- ✅ 国内可访问，不依赖 Google 服务
- ✅ 无需控制台配置，PAT 即开即用
- ✅ 免费且额度足够（5000/小时）
- ✅ 依赖更少（只需 expo-secure-store）
- ❌ 无实时同步（接受）
- ❌ 无 SDK 离线队列（自己写）

### 3.2 选 secret Gist，不选 public Gist

- secret Gist **不公开**（但 GitHub 工作人员可见，注意不要存敏感信息）
- public Gist 可被搜索到，不安全
- 配合 PAT 的 `gist` scope，只能本人读写

### 3.3 选单文件 JSON，不选多文件

- Gist 支持多文件，但单文件实现最简单
- 整文档同步，与 Firebase 方案一致的 LWW 冲突解决
- 单用户数据量 < 100KB，单文件足够

### 3.4 PAT 存 expo-secure-store，不存 AsyncStorage

- expo-secure-store 加密存储（iOS Keychain / Android Keystore）
- AsyncStorage 明文存储，root 设备可被读取
- PAT 是凭据，必须加密存储

---

## 4. 数据模型设计

### 4.1 Gist 结构

```
Gist ID: <自动生成，存本地>
  └── files/
      └── state.json    # 整个 store 快照
```

Gist 描述：`FitTrack Cloud State`（用于识别）

### 4.2 `state.json` 文件结构

```ts
interface CloudState {
  // 元数据
  schemaVersion: number;        // 数据 schema 版本，便于后续迁移
  updatedAt: number;            // 客户端时间戳（毫秒）
  updatedAtByDevice: string;    // 设备标识

  // 业务数据
  data: {
    userProfile: UserProfile | null;
    exercises: Exercise[];
    workoutPlans: WorkoutPlan[];
    workoutRecords: WorkoutRecord[];
    dailyActivities: DailyActivity[];
    // 注意：currentWorkout / currentCardio 不上云
  };
}
```

### 4.3 与本地 Zustand state 的映射

| Zustand 字段 | 是否上云 | 说明 |
|---|---|---|
| `userProfile` | ✅ | 用户资料 |
| `exercises` | ✅ | 动作库 |
| `workoutPlans` | ✅ | 训练计划 |
| `workoutRecords` | ✅ | 训练记录 |
| `dailyActivities` | ✅ | 每日活动 |
| `currentWorkout` | ❌ | 进行中训练，仅本地 |
| `currentCardio` | ❌ | 进行中有氧，仅本地 |

### 4.4 本地存储设计

```
fitness-tracker-storage          # zustand persist 自动管理（不变）
fitness-tracker-meta             # AsyncStorage，同步元信息
fitness-tracker-pat              # SecureStore，PAT（加密）
```

`fitness-tracker-meta` 结构：

```ts
interface LocalSyncMeta {
  gistId: string | null;        // Gist ID，首次同步后保存
  lastSyncedAt: number;         // 上次成功 push 时间
  lastPulledAt: number;         // 上次 pull 时间
  deviceId: string;             // 设备唯一 ID
  githubUser: string | null;    // GitHub 用户名（用于 UI 显示）
}
```

---

## 5. 同步架构与流程

### 5.1 总体架构

```
┌───────────────────────────────────────────────────────────┐
│                      React Native App                      │
│                                                            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│   │  UI 层       │───▶│  Zustand     │───▶│  persist    │  │
│   │ (Screens)   │    │  Store       │    │  →Async     │  │
│   └─────────────┘    └──────┬──────┘    │  Storage     │  │
│                             │            └─────────────┘  │
│                             │ subscribe                   │
│                             ▼                             │
│                      ┌─────────────┐                      │
│                      │ SyncManager │                      │
│                      │             │                      │
│                      │ - push()    │                      │
│                      │ - pull()    │                      │
│                      │ - poll()    │                      │
│                      │ - queue     │                      │
│                      └──────┬──────┘                      │
│                             │                             │
│   ┌─────────────────────────┼─────────────────────────┐  │
│   │  Services 层             │                          │  │
│   │  ┌──────────┐  ┌─────────┴──────┐  ┌──────────┐  │  │
│   │  │ auth.ts  │  │ gist.ts        │  │ meta.ts  │  │  │
│   │  │ (PAT)    │  │ (REST API)     │  │          │  │  │
│   │  └──────────┘  └────────────────┘  └──────────┘  │  │
│   │  ┌──────────────────────────────────────────────┐│  │
│   │  │ SecureStore (PAT 加密存储)                    ││  │
│   │  └──────────────────────────────────────────────┘│  │
│   └────────────────────────────────────────────────────┘  │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTPS
                              ▼
                ┌──────────────────────────┐
                │   GitHub API             │
                │   POST/GET/PATCH /gists  │
                │   (secret gist)          │
                └──────────────────────────┘
```

### 5.2 首次登录同步流程

```
用户输入 PAT
  │
  ▼
验证 PAT：GET /user
  │
  ├─ 无效 → 提示错误
  │
  └─ 有效
       │
       ▼
   保存 PAT 到 SecureStore
   保存 githubUser 到 meta
       │
       ▼
   查找现有 FitTrack Gist：
   GET /gists?per_page=100
   过滤 description === 'FitTrack Cloud State'
       │
       ├─ 找到 → 保存 gistId 到 meta
       │          pull Gist → merge 到本地
       │
       └─ 未找到（新用户）
              │
              ▼
          POST /gists 创建新 Gist
              │
              ▼
          保存 gistId 到 meta
          push 本地 state 到 Gist
       │
       ▼
   启动定时轮询（30s 一次）
   启动 store subscribe（写入节流 push）
```

### 5.3 写入同步流程（本地 → 云端）

```
Zustand store 变更
  │
  ▼
SyncManager 节流（debounce 3s，比 Firebase 多 1s 因为无 SDK 队列）
  │
  ▼
准备 pushData：
  - 从 store 取 5 个业务字段
  - 过滤掉 currentWorkout / currentCardio
  - 加 updatedAt = Date.now()
  - 加 updatedAtByDevice = deviceId
  │
  ▼
PATCH /gists/{gistId}
  files.state.json.content = JSON.stringify(pushData)
  │
  ├─ 网络正常（200）→ 更新 lastSyncedAt
  │
  └─ 网络异常
        │
        ├─ 写入待 push 队列（pendingPush 数组）
        │
        └─ 网络恢复后批量重试
```

### 5.4 轮询拉取流程（云端 → 本地）

```
每 30s 触发 poll()
  │
  ▼
GET /gists/{gistId}
  │
  ▼
解析 state.json
  │
  ▼
cloud.updatedAt > local.lastPulledAt ?
  ├─ 是 → merge cloud.data 到 store
  │       ├─ 保留本地 currentWorkout / currentCardio
  │       └─ 更新 lastPulledAt
  └─ 否 → 跳过
```

### 5.5 手动刷新

UI 提供同步按钮，点击调用 `pullNow()`：
- 立即拉取并 merge
- 显示同步状态
- 暴露最近同步时间

### 5.6 冲突解决：Last-Write-Wins

```
冲突场景：设备 A 和设备 B 几乎同时修改

设备 A push (updatedAt = T1)
设备 B push (updatedAt = T2, T2 > T1)
  │
  ▼
设备 A 下次 poll 收到 T2 > local.lastSyncedAt
  → 用 T2 的 data 覆盖本地
  → 设备 A 在 T1 到 T2 之间的本地修改会丢失

缓解：
  1. 个人应用几乎不会双端同时编辑
  2. 训练进行中不上云
  3. 节流 push 减少冲突概率
  4. 可选手动 pull 优先于 push（避免覆盖远端新数据）
```

### 5.7 离线处理

- **写入离线**：网络异常时入队 `pendingPush`，应用启动和网络恢复时重试
- **读取离线**：直接读 AsyncStorage（本地总是有数据）
- **网络监听**：用 `@react-native-community/netinfo` 监听网络变化（暂不引入，靠 API 失败触发重试）

### 5.8 防止回环

本地 push 改了 Gist，下次 poll 会拉到自己刚 push 的数据：

```ts
let lastPushedAt = 0;

// push 后记录
function push() {
  const payload = { ..., updatedAt: Date.now() };
  lastPushedAt = payload.updatedAt;
  return patchGist(payload);
}

// poll 时判断
function onPull(cloud) {
  if (cloud.updatedAt === lastPushedAt) return;  // 自己刚推的
  // merge...
}
```

---

## 6. 接口设计

### 6.1 `src/services/auth.ts`

```ts
import * as SecureStore from 'expo-secure-store';
import { getGithubUser } from './gist';

const PAT_KEY = 'fitness-tracker-pat';

export async function savePat(pat: string): Promise<string> {
  await SecureStore.setItemAsync(PAT_KEY, pat);
  const user = await getGithubUser(pat);
  return user.login;  // GitHub username
}

export async function getPat(): Promise<string | null> {
  return SecureStore.getItemAsync(PAT_KEY);
}

export async function clearPat(): Promise<void> {
  await SecureStore.deleteItemAsync(PAT_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const pat = await getPat();
  return !!pat;
}
```

### 6.2 `src/services/gist.ts`

```ts
import { getPat } from './auth';

const API = 'https://api.github.com';
const GIST_DESC = 'FitTrack Cloud State';
const STATE_FILE = 'state.json';

interface GistFile { filename: string; content: string; }
interface GistResponse {
  id: string;
  description: string;
  files: Record<string, { content: string }>;
}

async function headers(): Promise<HeadersInit> {
  const pat = await getPat();
  if (!pat) throw new Error('Not authenticated');
  return {
    'Authorization': `token ${pat}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function getGithubUser(pat: string) {
  const res = await fetch(`${API}/user`, {
    headers: { 'Authorization': `token ${pat}`, 'Accept': 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`Invalid PAT: ${res.status}`);
  return res.json();
}

export async function findFittrackGist(): Promise<string | null> {
  const h = await headers();
  // 翻页查找 description 匹配的 gist
  let page = 1;
  while (page <= 10) {
    const res = await fetch(`${API}/gists?per_page=100&page=${page}`, { headers: h });
    if (!res.ok) throw new Error(`List gist failed: ${res.status}`);
    const list: GistResponse[] = await res.json();
    if (list.length === 0) break;
    const found = list.find(g => g.description === GIST_DESC);
    if (found) return found.id;
    page++;
  }
  return null;
}

export async function createGist(content: string): Promise<string> {
  const h = await headers();
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [STATE_FILE]: { content } },
    }),
  });
  if (!res.ok) throw new Error(`Create gist failed: ${res.status}`);
  const data: GistResponse = await res.json();
  return data.id;
}

export async function getGistContent(gistId: string): Promise<string | null> {
  const h = await headers();
  const res = await fetch(`${API}/gists/${gistId}`, { headers: h });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Get gist failed: ${res.status}`);
  }
  const data: GistResponse = await res.json();
  return data.files?.[STATE_FILE]?.content ?? null;
}

export async function updateGist(gistId: string, content: string): Promise<void> {
  const h = await headers();
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      files: { [STATE_FILE]: { content } },
    }),
  });
  if (!res.ok) throw new Error(`Update gist failed: ${res.status}`);
}
```

### 6.3 `src/services/meta.ts`

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const META_KEY = 'fitness-tracker-meta';

export interface LocalSyncMeta {
  gistId: string | null;
  lastSyncedAt: number;
  lastPulledAt: number;
  deviceId: string;
  githubUser: string | null;
}

export async function loadMeta(): Promise<LocalSyncMeta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (raw) return JSON.parse(raw);
  const newMeta: LocalSyncMeta = {
    gistId: null,
    lastSyncedAt: 0,
    lastPulledAt: 0,
    deviceId: await generateDeviceId(),
    githubUser: null,
  };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(newMeta));
  return newMeta;
}

export async function saveMeta(meta: Partial<LocalSyncMeta>) {
  const current = await loadMeta();
  const next = { ...current, ...meta };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(next));
  return next;
}

async function generateDeviceId(): Promise<string> {
  return Crypto.randomUUID();
}
```

### 6.4 `src/services/sync.ts`

```ts
import { getGithubUser, findFittrackGist, createGist, getGistContent, updateGist } from './gist';
import { savePat, getPat, clearPat } from './auth';
import { loadMeta, saveMeta } from './meta';
import { useAppStore } from '../store';

const SCHEMA_VERSION = 1;
const SYNC_FIELDS = ['userProfile', 'exercises', 'workoutPlans', 'workoutRecords', 'dailyActivities'] as const;
const POLL_INTERVAL = 30_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPushContent: string | null = null;
let lastPushedAt = 0;
let isSyncing = false;

export async function login(pat: string) {
  const username = await savePat(pat);
  await saveMeta({ githubUser: username });
  await startSync();
  return username;
}

export async function logout() {
  stopSync();
  await clearPat();
  await saveMeta({ gistId: null, githubUser: null, lastSyncedAt: 0, lastPulledAt: 0 });
}

export async function startSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const meta = await loadMeta();
    let gistId = meta.gistId;

    // 首次：找或建 Gist
    if (!gistId) {
      gistId = await findFittrackGist();
      if (!gistId) {
        // 新用户：本地推上去
        const content = buildPushContent();
        gistId = await createGist(content);
        lastPushedAt = JSON.parse(content).updatedAt;
        await saveMeta({ gistId, lastSyncedAt: Date.now() });
      } else {
        await saveMeta({ gistId });
      }
    }

    // pull
    await pullNow();

    // 监听 store 变化
    useAppStore.subscribe(() => schedulePush());

    // 启动轮询
    pollTimer = setInterval(() => pullNow().catch(console.warn), POLL_INTERVAL);
  } finally {
    isSyncing = false;
  }
}

export function stopSync() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  useAppStore.subscribe(() => {}) && useAppStore.destroy?.(); // 注意：subscribe 返回 unsubscribe，这里需保存
}

export async function pullNow() {
  const meta = await loadMeta();
  if (!meta.gistId) return;
  const content = await getGistContent(meta.gistId);
  if (!content) return;
  const cloud = JSON.parse(content);
  if (cloud.updatedAt === lastPushedAt) return;  // 自己刚推的
  if (cloud.updatedAt <= meta.lastPulledAt) return;  // 旧数据
  mergeCloudToLocal(cloud.data);
  await saveMeta({ lastPulledAt: cloud.updatedAt });
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push().catch(console.warn), 3000);
}

async function push() {
  const meta = await loadMeta();
  if (!meta.gistId) return;
  const content = buildPushContent();
  try {
    await updateGist(meta.gistId, content);
    lastPushedAt = JSON.parse(content).updatedAt;
    await saveMeta({ lastSyncedAt: Date.now() });
    pendingPushContent = null;
  } catch (e) {
    // 离线入队
    pendingPushContent = content;
    throw e;
  }
}

function buildPushContent(): string {
  const state = useAppStore.getState();
  const data: Record<string, unknown> = {};
  SYNC_FIELDS.forEach(k => { data[k] = state[k]; });
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    updatedAtByDevice: loadMetaSync().deviceId,
    data,
  };
  return JSON.stringify(payload);
}

// 同步读 meta（仅 deviceId，初始化时已写入）
let cachedDeviceId = '';
async function loadMetaSync(): Promise<{ deviceId: string }> {
  if (!cachedDeviceId) {
    const m = await loadMeta();
    cachedDeviceId = m.deviceId;
  }
  return { deviceId: cachedDeviceId };
}

function mergeCloudToLocal(cloudData: any) {
  const store = useAppStore.getState();
  const patch: any = {};
  SYNC_FIELDS.forEach(k => {
    if (cloudData[k] !== undefined) patch[k] = cloudData[k];
  });
  patch.currentWorkout = store.currentWorkout;
  patch.currentCardio = store.currentCardio;
  useAppStore.setState(patch, false);
}
```

> 注：上面 `stopSync` 的 subscribe 处理需要保存 unsubscribe 函数。实际实现时改为模块级变量。

### 6.5 `src/store/index.ts` 改造

```ts
// 新增字段
interface AppState {
  // ... 现有字段
  syncStatus: 'idle' | 'syncing' | 'offline' | 'error';
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

// persist 加 partialize，避免 syncStatus 持久化
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'fitness-tracker-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      userProfile: state.userProfile,
      exercises: state.exercises,
      workoutPlans: state.workoutPlans,
      workoutRecords: state.workoutRecords,
      dailyActivities: state.dailyActivities,
    }),
  }
)
```

### 6.6 `src/screens/LoginScreen.tsx`（新增）

简洁登录页：
- 输入框：GitHub PAT
- 「登录」按钮 → 调用 `login(pat)`
- 「如何获取 Token」链接 → 跳转 https://github.com/settings/tokens
- 错误提示
- 不支持游客模式（Gist 方案必须有 PAT）

### 6.7 `App.tsx` 改造

```
App
└─ ErrorBoundary
   └─ AppContent
      ├─ useEffect: checkIsLoggedIn()
      ├─ if !pat → <LoginScreen onLogin={...} />
      └─ if pat
         ├─ useEffect: startSync()
         └─ <MainApp />
```

### 6.8 ProfileScreen 增加同步状态

在 [src/screens/ProfileScreen.tsx](file:///workspace/src/screens/ProfileScreen.tsx) 加：
- GitHub 用户名显示
- 最近同步时间
- 「立即同步」按钮 → `pullNow() + push()`
- 「退出登录」按钮 → `logout()`

---

## 7. 实施步骤

| # | 步骤 | 涉及文件 | 验证 |
|---|---|---|---|
| 1 | 安装依赖 | `package.json` | `npx expo install expo-secure-store expo-crypto` |
| 2 | 写 services 层 | `src/services/{auth,gist,meta,sync}.ts` | TS 编译通过 |
| 3 | 写 LoginScreen | `src/screens/LoginScreen.tsx` | PAT 输入可登录 |
| 4 | 改 App.tsx | `App.tsx` | 未登录显示 LoginScreen |
| 5 | 改 store | `src/store/index.ts` | partialize 生效 |
| 6 | ProfileScreen 同步入口 | `src/screens/ProfileScreen.tsx` | 显示用户名+同步按钮 |
| 7 | 端到端测试 | - | 双设备同步验证 |

---

## 8. 测试方案

### 8.1 集成测试

| 场景 | 步骤 | 预期 |
|---|---|---|
| 首次登录 | 输入有效 PAT | 创建 Gist，本地数据上传 |
| 二次登录（同设备） | 重启应用 | 自动登录，pull 最新数据 |
| 二次登录（新设备） | 同 PAT 登录 | 找到现有 Gist，本地被云端覆盖 |
| 单设备写入 | 加训练记录 | 3s 后 Gist 内容更新 |
| 双设备同步 | A 加记录，等 30s，看 B | B 收到新记录 |
| 离线写入 | 断网加记录，联网 | 联网后 push 成功 |
| 冲突 | A、B 同时改 | updatedAt 大的覆盖 |
| 手动刷新 | 点同步按钮 | 立即 pull + push |
| 登出 | 点退出 | PAT 清除，回到登录页 |

### 8.2 测试小技巧

- 查看当前 Gist：`https://gist.github.com/<username>/<gistId>`
- 用 curl 直接测：`curl -H "Authorization: token ghp_xxx" https://api.github.com/gists`

---

## 9. 风险与限制

| 限制 | 影响 | 缓解 |
|---|---|---|
| GitHub API 限流 | 5000/小时 | 节流 3s + 轮询 30s 足够 |
| 无实时同步 | 多设备延迟最多 30s | 加手动刷新按钮 |
| LWW 冲突 | 双端同时编辑丢数据 | 个人应用场景概率低 |
| PAT 泄露风险 | 别人拿到可读写所有 Gist | 最小 scope（仅 gist），定期更换 |
| secret Gist 仍可被 GitHub 工作人员看到 | 隐私风险 | 不存敏感信息（如密码） |
| Gist 文件大小限制 | ~1MB 单文件 | 数据量大时拆分 |
| 网络不稳定 | 国内访问 GitHub 偶尔慢 | 重试 + 离线队列 |

---

## 10. 后续演进路径

| 阶段 | 触发条件 | 改造内容 |
|---|---|---|
| v1（本期） | 当前 | Gist 单文件 LWW |
| v2 | 数据 > 800KB | 多文件拆分（records.json / plans.json） |
| v3 | 需要更实时 | 接入 GitHub Webhook + 自建中转服务 |
| v4 | 需要更稳定 | 迁移到国内 BaaS（LeanCloud）或自建后端 |
| v5 | 需要协作 | 改 WatermelonDB + 自建 GraphQL |

---

## 11. 评审检查表

- [ ] PAT scope 仅 `gist`，最小权限
- [ ] PAT 用 SecureStore 加密存储
- [ ] Gist 描述固定为 `FitTrack Cloud State`，便于查找
- [ ] 节流 push（3s）避免限流
- [ ] 轮询间隔（30s）平衡及时性和流量
- [ ] LWW 冲突策略可接受
- [ ] 不支持游客模式可接受
- [ ] ProfileScreen 显示 GitHub 用户名便于确认账号

评审通过后按第 7 章实施步骤依次执行。
