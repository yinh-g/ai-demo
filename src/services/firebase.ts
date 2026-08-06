import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import Constants from 'expo-constants';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function getFirebaseConfig(): FirebaseConfig {
  const extra = (Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined) ?? {} as FirebaseConfig;
  if (!extra.apiKey || extra.apiKey === 'YOUR_API_KEY') {
    throw new Error(
      'Firebase 未配置。请在 app.json 的 expo.extra.firebase 中填入你 Firebase 项目的配置。\n' +
      '获取路径：Firebase 控制台 → 项目设置 → 你的应用 → 「SDK 设置和配置」→ npm'
    );
  }
  return extra;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (app) return { app, auth: auth!, db: db! };
  const config = getFirebaseConfig();
  app = getApps().length ? getApp() : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  return { app, auth, db };
}

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!app) return initFirebase();
  return { app, auth: auth!, db: db! };
}

export function isFirebaseConfigured(): boolean {
  try {
    const extra = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
    return !!(extra?.apiKey && extra.apiKey !== 'YOUR_API_KEY' && extra.projectId && extra.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return false;
  }
}
