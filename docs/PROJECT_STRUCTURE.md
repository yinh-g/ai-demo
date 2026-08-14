# FitTrack 项目结构与技术栈分析

> 本文档用于帮助 AI 快速理解 FitTrack 健身追踪 App 的整体架构和代码结构。
> 最后更新：2026-08-14

---

## 1. 项目概览

**项目名称**: FitTrack (fittrack)
**版本**: 1.0.1
**类型**: 跨平台移动端健身追踪应用 (Expo/React Native)
**目标平台**: iOS, Android, Web
**主要功能**:
- 力量训练与有氧训练记录
- 训练计划管理
- 动作库管理 (235+ 内置动作)
- 身体数据管理与统计图表
- 肌肉增长与减脂预测算法
- 用户资料管理
- 云端数据同步 (Supabase)

---

## 2. 技术栈

### 2.1 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Expo | ~57.0.9 | 跨平台开发框架（参考文档：https://docs.expo.dev/versions/v57.0.0/） |
| React | 19.2.3 | UI 库 |
| React Native | 0.86.2 | 移动端开发框架 |
| React Native Web | 0.21.2 | Web 端适配 |
| TypeScript | ~6.0.3 | 类型系统（strict 模式） |

### 2.2 状态管理与存储

| 技术 | 版本 | 用途 |
|------|------|------|
| Zustand | ^5.0.14 | 全局状态管理 + persist 中间件 |
| @react-native-async-storage/async-storage | ^1.24.0 | 本地持久化存储 |

### 2.3 导航

| 技术 | 版本 | 用途 |
|------|------|------|
| @react-navigation/native | ^7.3.14 | 导航核心 |
| @react-navigation/bottom-tabs | ^7.18.14 | 底部 Tab 导航 |
| @react-navigation/stack | ^7.10.17 | 栈导航 |
| react-native-screens | ^4.26.2 | 原生屏幕优化 |
| react-native-safe-area-context | ^5.8.0 | 安全区域适配 |

### 2.4 UI 组件与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| react-native-paper | ^5.15.3 | Material Design 组件库 |
| @expo/vector-icons | ^15.1.1 | 图标库 (MaterialCommunityIcons 等) |
| react-native-gesture-handler | ^3.1.0 | 手势处理 |
| react-native-reanimated | ^4.5.3 | 动画库 |

### 2.5 数据可视化

| 技术 | 版本 | 用途 |
|------|------|------|
| react-native-chart-kit | ^7.0.2 | 图表组件库 |

### 2.6 后端与云服务

| 技术 | 版本 | 用途 |
|------|------|------|
| @supabase/supabase-js | ^2.112.2 | BaaS 平台（认证 + 数据库 + 存储） |
| firebase | ^9.23.0 | Firebase SDK（历史兼容，主要用 Supabase） |

### 2.7 Expo 插件

| 插件 | 用途 |
|------|------|
| expo-constants | 读取 app.json 配置 |
| expo-crypto | 加密工具（生成设备 ID） |
| expo-image-picker | 头像选择/上传 |
| expo-secure-store | 安全存储（Face ID 登录） |
| expo-sensors | 传感器数据 |
| expo-status-bar | 状态栏控制 |

### 2.8 开发工具

| 工具 | 用途 |
|------|------|
| sharp | ^0.35.3 | 图片处理 (构建时) |
| @types/react | ~19.2.2 | React 类型定义 |

### 2.9 Node 要求

```json
"engines": {
  "node": ">=18.0.0 <21.0.0"
}
```

---

## 3. 目录结构

```
fitness-tracker/
├── assets/                          # 静态资源
│   ├── icons/                       # 肌肉部位图标 (arm.png, chest.png, leg.png 等)
│   ├── icon.png                     # App 图标
│   ├── splash.png                   # 启动图
│   ├── adaptive-icon.png            # Android 自适应图标
│   └── favicon.png                  # Web favicon
│
├── src/
│   ├── components/                  # 通用组件
│   │   ├── ErrorBoundary.tsx        # 错误边界组件
│   │   └── ExercisePickerDialog.tsx # 动作选择弹窗
│   │
│   ├── data/                        # 静态数据
│   │   └── defaultExercises.ts      # 235+ 内置训练动作库
│   │
│   ├── screens/                     # 页面组件
│   │   ├── LoginScreen.tsx          # 登录/注册页
│   │   ├── HomeScreen.tsx           # 首页 (Tab 1)
│   │   ├── PlanScreen.tsx           # 训练计划页 (Tab 2)
│   │   ├── TrainingScreen.tsx       # 训练页 (Tab 3)
│   │   ├── StatsScreen.tsx          # 统计页 (Tab 4)
│   │   ├── ProfileScreen.tsx        # 个人资料页 (Tab 5)
│   │   ├── CreatePlanScreen.tsx     # 创建/编辑训练计划
│   │   ├── ExerciseLibraryScreen.tsx# 动作库管理
│   │   ├── WorkoutSessionScreen.tsx # 力量训练进行中
│   │   ├── CardioSessionScreen.tsx  # 有氧训练进行中
│   │   ├── WorkoutRecordDetailScreen.tsx  # 训练记录详情
│   │   ├── StatsDetailScreen.tsx    # 数据统计详情
│   │   ├── PredictionScreen.tsx     # 身体预测（增肌/减脂）
│   │   └── BodyDataScreen.tsx       # 身体数据录入
│   │
│   ├── services/                    # 业务服务层
│   │   ├── health/                  # 健康数据服务
│   │   │   ├── index.ts             # 健康服务入口
│   │   │   ├── providerFactory.ts   # 健康 Provider 工厂
│   │   │   └── types.ts             # 健康相关类型
│   │   ├── auth.ts                  # 认证服务 (Supabase Auth)
│   │   ├── supabase.ts              # Supabase 客户端初始化
│   │   ├── firestore.ts             # 云数据读写（Supabase 表）
│   │   ├── sync.ts                  # 云同步核心逻辑（Pull/Push/节流）
│   │   ├── meta.ts                  # 本地同步元数据 + 设备 ID
│   │   ├── avatarStorage.ts         # 头像存储服务
│   │   └── firebase.ts              # Firebase 兼容层
│   │
│   ├── store/                       # 全局状态
│   │   └── index.ts                 # Zustand Store (AppState)
│   │
│   ├── types/                       # TypeScript 类型定义
│   │   └── index.ts                 # 全部核心类型
│   │
│   └── utils/                       # 工具函数
│       ├── prediction.ts            # 肌肉增长预测算法
│       └── fatLossPrediction.ts     # 减脂预测算法
│
├── App.tsx                          # 应用入口 + 导航配置
├── index.ts                         # Expo 注册入口
├── app.json                         # Expo 配置（含 Supabase URL/Key）
├── package.json                     # 依赖配置
├── tsconfig.json                    # TypeScript 配置
├── eas.json                         # Expo EAS 构建配置
├── codemagic.yaml                   # Codemagic CI/CD 配置
├── firestore.rules                  # 数据库规则
├── AGENTS.md                        # AI 开发规范（Expo 文档版本提示）
├── FIREBASE_SETUP.md                # Firebase 设置指南
└── docs/
    ├── GITHUB_GIST_SYNC_DESIGN.md   # Gist 同步设计文档
    └── PROJECT_STRUCTURE.md         # 本文件
```

---

## 4. 核心架构模块详解

### 4.1 状态管理 (Zustand Store)

**文件**: [src/store/index.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/store/index.ts)

**持久化方式**: Zustand `persist` 中间件 + AsyncStorage，存储 Key: `fitness-tracker-storage`

**核心状态切片**:

| 切片 | 类型 | 持久化 | 说明 |
|------|------|--------|------|
| `userProfile` | `UserProfile \| null` | ✅ | 用户身体资料（体重、身高、体脂、年龄等） |
| `exercises` | `Exercise[]` | ✅ | 动作库（内置 235+ + 自定义） |
| `workoutPlans` | `WorkoutPlan[]` | ✅ | 训练计划列表 |
| `workoutRecords` | `WorkoutRecord[]` | ✅ | 历史训练记录 |
| `dailyActivities` | `DailyActivity[]` | ✅ | 每日活动数据（步数、卡路里、距离） |
| `currentWorkout` | `WorkoutRecord \| null` | ❌ | 进行中的力量训练 |
| `currentCardio` | `WorkoutRecord \| null` | ❌ | 进行中的有氧训练 |
| `syncStatus` | `'idle' \| 'syncing' \| 'offline' \| 'error'` | ❌ | 云同步状态 |
| `authUser` | `string \| null` | ❌ | 登录用户标识（运行时） |
| `isGuest` | `boolean` | ❌ | 游客模式标识（运行时） |

**关键 Actions**:
- `startWorkout(planId)` - 根据计划创建训练记录
- `endWorkout()` - 保存训练并加入历史记录
- `startCardio(activity)` / `endCardio(data)` - 有氧训练流程
- `addExercise` / `updateExercise` / `deleteExercise` - 动作库 CRUD
- `addWorkoutPlan` / `updateWorkoutPlan` / `deleteWorkoutPlan` - 计划 CRUD

### 4.2 类型系统

**文件**: [src/types/index.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/types/index.ts)

**核心类型关系**:

```
UserProfile (用户资料)
├── 基础信息: weight, height, bodyFat, age, gender
├── 训练信息: trainingYears, proteinIntake, sleepHours
└── 目标信息: muscleGainGoal, fatLossGoal, dailyCalorieIntake, targetBodyFat

Exercise (动作)
├── id, name
├── category: chest | back | legs | shoulders | arms | core | cardio
├── muscleGroup: string[]
└── equipment: barbell | dumbbell | machine | bodyweight | cable | kettlebell | cardio

WorkoutPlan (训练计划)
├── id, name, isTemplate
└── exercises: PlanExercise[] (exerciseId, sets, reps, weight, restTime, order)

WorkoutRecord (训练记录)
├── workoutType: strength | cardio
├── date, startTime, endTime, duration
├── exercises: ExerciseRecord[]
│   ├── exerciseId
│   ├── sets?: SetRecord[] (力量: weight, reps, completed)
│   └── cardioSegments?: CardioSegment[] (有氧: duration, distance, speed, heartRate)
├── totalVolume (力量总容量)
├── totalDistance, totalCalories (有氧)
└── status: completed | cancelled

MuscleGrowthPrediction / FatLossPrediction
└── 预测输入 → 多因素系数 → 预测结果 + 置信度 + 建议
```

### 4.3 导航架构

**文件**: [App.tsx](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/App.tsx)

```
NavigationContainer
└── Stack.Navigator (根栈)
    ├── Main (无标题) → Bottom Tabs
    │   ├── Home (首页)
    │   ├── Plans (计划)
    │   ├── Training (训练)
    │   ├── Stats (统计)
    │   └── Profile (我的)
    ├── ExerciseLibrary (动作库)
    ├── CreatePlan (创建计划)
    ├── WorkoutSession (力量训练中)
    ├── CardioSession (有氧训练中)
    ├── Prediction (身体预测)
    ├── BodyData (身体数据)
    ├── WorkoutRecordDetail (训练详情)
    └── StatsDetail (数据详情)
```

**初始化流程** (AppContent useEffect):
1. 初始化 Supabase 客户端（未配置时给出提示）
2. 从 AsyncStorage 恢复登录态，恢复后立即 `startSync()`
3. 注册 `onUserChanged` 监听后续登录/登出事件
4. 若动作库为空，注入 235+ 默认动作

### 4.4 认证系统

**文件**: [src/services/auth.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/services/auth.ts)

**后端**: Supabase Auth (邮箱/密码)

**核心函数**:
| 函数 | 说明 |
|------|------|
| `login(email, password)` | 邮箱密码登录 |
| `register(email, password)` | 邮箱密码注册（密码≥6位） |
| `logoutSupabase()` | 登出 + 清除本地邮箱 |
| `getCurrentUser()` | 获取当前登录用户 |
| `onUserChanged(callback)` | 订阅 Auth 状态变化（返回 unsubscribe） |
| `getSavedEmail()` | 读取本地缓存邮箱 |

**注意**: Supabase RN 环境必须显式配置 `storage: AsyncStorage`，否则 `persistSession` 会静默失败。

### 4.5 云同步系统

**文件**:
- [src/services/sync.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/services/sync.ts) - 同步核心
- [src/services/firestore.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/services/firestore.ts) - 云数据读写
- [src/services/meta.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/services/meta.ts) - 本地同步元数据

**同步字段** (`SYNC_FIELDS`):
```typescript
['userProfile', 'exercises', 'workoutPlans', 'workoutRecords', 'dailyActivities']
```

**数据流向**:
```
┌─────────────┐   pullNow()    ┌──────────────────┐
│  Supabase   │ ─────────────→ │  Zustand Store   │
│  user_data  │                │  (本地 AsyncStorage)
│   表        │ ←───────────── │                  │
└─────────────┘   push() 节流  └──────────────────┘
                  (3000ms debounce)
```

**核心机制**:
- **Pull (云端 → 本地)**: `pullNow()` 读取 `user_data` 表 → 时间戳防回环/防旧数据 → `mergeCloudToLocal()` 合并（保留当前训练状态）
- **Push (本地 → 云端)**: 订阅 store 变化 → `schedulePush()` 3000ms 去抖 → `writeCloudState()` upsert 到 Supabase
- **同步元数据**: `meta.ts` 维护 `lastSyncedAt`, `lastPulledAt`, `deviceId`（首次生成 UUID 并永久缓存）
- **Schema 版本**: `SCHEMA_VERSION = 1`，用于未来迁移

**登录/注册流程**:
- `login()` → Supabase 登录 → 设 authUser → `startSync()`
- `register()` → Supabase 注册 → 若云端无数据，本地数据作为种子 push → `startSync()`
- `logout()` → 停止同步订阅 → Supabase 登出 → 清空元数据时间戳

### 4.6 预测算法

**文件**:
- [src/utils/prediction.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/utils/prediction.ts) - 肌肉增长预测
- [src/utils/fatLossPrediction.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/utils/fatLossPrediction.ts) - 减脂预测

**肌肉增长预测因素**:
```
monthlyGain = userWeight
            × baseGrowthRate (新手 1.25%/月 → 高级 0.15%/月)
            × ageFactor (<26岁 1.1 → ≥66岁 0.4)
            × genderFactor (男 1.0 / 女 0.85)
            × volumeFactor (周容量 100~200×体重 kg·reps = 1.0)
            × nutritionFactor (蛋白质 1.6~2.0g/kg = 1.0)
            × recoveryFactor (睡眠 ≥8h = 1.0)
```

**减脂预测因素**: BMR × 活动系数 × 饮食缺口 × 蛋白质系数 × 睡眠系数 × 性别系数

### 4.7 动作库数据

**文件**: [src/data/defaultExercises.ts](file:///d:/Program Files (x86)/trace_projects/install_openclaw/fitness-tracker/src/data/defaultExercises.ts)

- **总数**: 235+ 内置动作
- **分类**: chest(胸) / back(背) / legs(腿) / shoulders(肩) / arms(臂) / core(核心) / cardio(有氧)
- **器械**: barbell / dumbbell / machine / bodyweight / cable / kettlebell / cardio
- **附加映射**: `categoryLabels`, `equipmentLabels` 中文字典

---

## 5. 关键配置文件

### 5.1 app.json (Expo 配置)

```json
{
  "name": "FitTrack",
  "slug": "fittrack",
  "orientation": "portrait",
  "splash.backgroundColor": "#6366F1",  // 品牌紫色
  "ios.bundleIdentifier": "com.yourcompany.fittrack",
  "android.package": "com.yourcompany.fittrack",
  "plugins": ["expo-secure-store"],  // Face ID
  "extra.supabase": {
    "url": "https://pnncwyozewabagebdgxv.supabase.co",
    "anonKey": "sb_publishable_4fu8BY9uwrqS7xLzlUwEBQ_5A76zEEw"
  }
}
```

### 5.2 Supabase 表结构

需要 `user_data` 表：
| 列 | 类型 | 说明 |
|----|------|------|
| `user_id` | uuid (PK, FK auth.users) | 用户 ID |
| `data` | jsonb | CloudState 对象（schemaVersion + updatedAt + data） |
| `updated_at` | timestamptz | 数据库更新时间 |

---

## 6. 脚本命令

| 命令 | 说明 |
|------|------|
| `npm start` | Expo 开发服务器 (Metro) |
| `npm run android` | 启动 Android 模拟器/设备 |
| `npm run ios` | 启动 iOS 模拟器 (仅 macOS) |
| `npm run web` | 启动 Web 版本 |

---

## 7. CI/CD 与构建

- **Codemagic**: `codemagic.yaml` - 跨平台 CI/CD
- **Expo EAS**: `eas.json` - Expo 云构建配置

---

## 8. 开发注意事项

1. **Expo 版本锁定**: 必须参考 https://docs.expo.dev/versions/v57.0.0/ ，Expo API 变化频繁
2. **TypeScript strict**: 开启严格模式，不允许 any 滥用
3. **Node 版本**: 必须 18 ≤ Node < 21
4. **AsyncStorage 关键**: Supabase Auth、Zustand persist、本地 meta 都依赖 AsyncStorage，不要随意移除
5. **同步防回环**: push 后记录 `lastPushedAt`，pull 时跳过自己刚推送的版本
6. **游客模式**: `isGuest` 为 true 时即使无 authUser 也可进入主应用（数据仅本地）
7. **进行中训练保留**: 云端合并时 `currentWorkout` / `currentCardio` 不会被覆盖
