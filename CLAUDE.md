# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

FitTrack (fittrack) — 跨平台健身追踪 App（Expo / React Native），支持力量与有氧训练记录、训练计划、动作库（235+ 内置动作）、身体数据统计图表、增肌/减脂预测、Supabase 云同步。UI 文案为中文。

> 详细的技术栈、目录结构、类型关系、预测算法公式见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)。本文件只保留最关键的架构与坑点。

## 关键约束（务必遵守）

1. **Expo SDK 57 已大改**。写任何 Expo/RN 相关代码前，先读版本化文档 https://docs.expo.dev/versions/v57.0.0/ ，不要套用旧版 Expo API（`AGENTS.md` 有同样提示）。
2. **Node 版本锁死 `>=18.0.0 <21.0.0`**（`package.json` 的 `engines`）。用 Node 18 或 20，勿用 21+。Codemagic 构建用 node 20。
3. **TypeScript 开启 `strict`**，不要用 `any` 逃避类型。
4. **AsyncStorage 是命脉**：Supabase Auth、Zustand persist、同步元数据都依赖它。Supabase 客户端必须显式传 `storage: AsyncStorage`，否则 `persistSession` 会静默失败、每次重启都要重新登录（见 `src/services/supabase.ts`）。

## 常用命令

```bash
npm install          # 安装依赖（Node 18/20）
npm start            # Expo 开发服务器（Metro）
npm run android      # Android 模拟器/真机
npm run ios          # iOS 模拟器（仅 macOS）
npm run web          # Web 版
npx tsc --noEmit     # 类型检查（项目没有配置 lint / test 脚本，也没有测试套件）
```

构建发布（无需本地跑，配置已就位）：
- **Expo EAS**：`eas.json`（`npx eas build -p android --profile preview`）
- **Codemagic**：`codemagic.yaml`（Android release APK，iOS 因缺付费开发者账号已禁用）

## 架构（大图）

### 状态管理：单一全局 Zustand store

`src/store/index.ts` 是唯一数据源，通过 `persist` 中间件持久化到 AsyncStorage（key `fitness-tracker-storage`）。所有屏幕/服务都读写这一个 store，不要另造局部状态存储。

**持久化的业务字段**：`userProfile`、`exercises`、`workoutPlans`、`workoutRecords`、`dailyActivities`。
**不持久化的运行时字段**：`currentWorkout` / `currentCardio`（进行中的训练）、`syncStatus`、`authUser`、`isGuest`（`partialize` 控制）。

### 导航：根 Stack + 底部 Tab

`App.tsx` 里 `Stack.Navigator`（根栈）套一个 5-Tab 的 `Tab.Navigator`（首页/计划/训练/统计/我的），另有 8 个栈屏（动作库、创建计划、力量/有氧训练进行中、身体预测、身体数据、训练详情、数据详情）。新增页面要同时改 `App.tsx` 的 `Stack.Screen` 注册。

### 后端：Supabase 为主，Firebase 是遗留兼容层

- **Supabase**（主）：`src/services/supabase.ts` 初始化客户端；`auth.ts` 做邮箱/密码认证；`firestore.ts` 读写 `user_data` 表（jsonb）。
- **Firebase**（`src/services/firebase.ts`）：历史遗留的兼容层，`FIREBASE_SETUP.md` 描述了它，但当前实际同步走 Supabase，不要误以为 Firebase 是主链路。

配置来源：`app.json` 的 `expo.extra.supabase`（url + anonKey）和 `expo.extra.firebase`，通过 `expo-constants` 读取。

### 云同步引擎（`src/services/sync.ts`）

- **同步字段** `SYNC_FIELDS`：`['userProfile', 'exercises', 'workoutPlans', 'workoutRecords', 'dailyActivities']`。`currentWorkout`/`currentCardio` 永不上云。
- **Push**（本地→云端）：订阅 store 变化 → 3s 去抖 → `writeCloudState()` upsert 到 Supabase。
- **Pull**（云端→本地）：`pullNow()` 读云端 → 时间戳防回环/防旧数据 → `mergeCloudToLocal()`。
- **防回环**：push 后记录 `lastPushedAt`，pull 时跳过 `updatedAt === lastPushedAt` 的版本。
- **冲突**：Last-Write-Wins（`updatedAt` 比较）。
- **元数据**（`src/services/meta.ts`）：`lastSyncedAt` / `lastPulledAt` / `deviceId`（首次生成 UUID 并永久缓存）。

### 健康数据 Provider（`src/services/health/`）

抽象了统一接口 `HealthProvider`（步数/卡路里/心率/授权）。**当前所有 Provider 都是占位实现**（`createPlaceholderProvider` 返回 `available: false`）。未来接入 OPPO / 华为 / 小米 / Apple HealthKit / Health Connect 时，在 `providerFactory.ts` 里按平台/品牌分发。UI 层只依赖 `HealthProvider` 接口。

### 预测算法（纯函数，无副作用）

`src/utils/prediction.ts`（增肌）、`src/utils/fatLossPrediction.ts`（减脂）。输入用户身体数据，多因素系数相乘得月/年变化量 + 置信度。改公式时注意这些是纯计算，不碰 store/网络。

## 注意

- `docs/GITHUB_GIST_SYNC_DESIGN.md` 是**未来备选方案的设计文档（待评审），并未实现**。当前同步走 Supabase，别照着 Gist 方案去改代码。
- 默认动作库在 `src/data/defaultExercises.ts`；`App.tsx` 启动时会校验并补齐缺失的默认动作（按 id 去重）。
- 游客模式：`isGuest=true` 时即使 `authUser` 为空也能进主应用（数据仅本地）。
