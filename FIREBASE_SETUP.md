# Firebase 配置指引

本项目已完成 Firebase 云同步接入：Email/Password 注册登录 + Firestore 数据同步。

## 1. 创建 Firebase 项目（控制台操作，约 15 分钟）

1. 打开 [firebase.google.com](https://firebase.google.com/) 并登录
2. **创建项目** → 项目名随意（例如 `fittrack-prod`）→ 关闭 Google Analytics（纯个人使用不需要）→ 等待创建完成
3. 项目主页中央 → **添加应用 → 选择 Web 应用（</> 图标）**
   - App nickname 填 `FitTrack Web`
   - **勾选**「同时为该应用设置 Firebase Hosting」（Web 版方便测试）
   - 点「注册应用」
   - 到第 2 步「添加 Firebase SDK」时，复制 `firebaseConfig` 对象 6 个字段：
     ```js
     apiKey: "AIza...",
     authDomain: "xxx.firebaseapp.com",
     projectId: "xxx",
     storageBucket: "xxx.appspot.com",
     messagingSenderId: "123456",
     appId: "1:123...:web:abc..."
     ```
4. 在项目根目录打开 `app.json`，把上一步 6 个字段粘贴到 `expo.extra.firebase` 中对应的占位字段。

## 2. 启用 Email/Password 登录方式

1. Firebase 控制台 → **Authentication** → **Sign-in method**
2. 在「Native providers」里找到 **Email/Password** → 点编辑 → **启用** → 保存
3. 不需要启用「Email link (passwordless sign-in)」

## 3. 创建 Firestore 数据库 + 应用安全规则

1. Firebase 控制台 → **Firestore Database** → **创建数据库**
2. 安全规则：先选「**以生产模式开始**」（不要选测试模式，测试模式有 30 天有效期）
3. 位置：选离你最近的区域，如 `asia-east2 (Hong Kong)` 或 `asia-northeast1 (Tokyo)`
4. 创建完成后，点顶部「**规则**」tab，把项目根目录 `firestore.rules` 的内容完整复制粘贴进去 → **发布**

## 4. 验证

```bash
# 安装新依赖（新增 firebase、expo-constants）
npm install

# 本地启动
npx expo start
```

打开 App 后：
1. LoginScreen 不会再显示「尚未配置 Firebase」提示
2. 切到「注册」tab，用任意邮箱（如 `test@example.com`）+ 密码（6 位以上）注册
3. 注册成功后会自动跳转到主页
4. Firebase 控制台 → Firestore Database → 数据 → 应出现 `/users/{uid}/state/sync` 文档，内容包含 schemaVersion、updatedAt、data（5 个业务字段）
5. 在另一台设备或模拟器上用**同一邮箱**登录 → 应拉到相同数据
6. 在 ProfileScreen 点「立即同步」→ 同步状态应由「同步中」回到「已连接」

## 5. 未来可选增强（按需）

- **忘记密码**：Firebase 控制台 → Authentication → Users → 点用户三个点 → 重置密码（App 端按钮后续可加 `sendPasswordResetEmail`）
- **邮箱验证**：注册后调用 `sendEmailVerification` 要求用户点击邮件链接
- **Storage**（存头像/训练视频）：启用 Firebase Storage，规则同样限定 `users/{uid}/**`
- **Cloud Messaging**（跨设备同步提醒）：启用 FCM
- **多登录方式**：Authentication → Sign-in method 追加 Google、Apple、微信等（需各自开发者账号）
- **离线持久化**：Firebase JS SDK v10+ React Native 默认未启用持久化，如需完全离线可读可写，调用 `enableIndexedDbPersistence(db)` 或 `enableMultiTabIndexedDbPersistence(db)`

## 6. 数据结构说明

Firestore 路径：`/users/{uid}/state/sync`

| 字段 | 类型 | 说明 |
|---|---|---|
| schemaVersion | number | 数据结构版本（当前 1），未来升级数据用 |
| updatedAt | number | 毫秒时间戳，冲突时 LWW 比较 |
| updatedAtByDevice | string | 写入方 deviceId，定位冲突来源 |
| data.userProfile | object \| null | 用户身体数据（年龄/体重/性别等） |
| data.exercises | array | 动作库 |
| data.workoutPlans | array | 训练计划 |
| data.workoutRecords | array | 训练记录 |
| data.dailyActivities | array | 每日步数等活动数据 |

`currentWorkout`、`currentCardio`（进行中的临时状态）**不上云**，只在本地 AsyncStorage 持久化。
