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
  // 尝试多种方式读取配置（Expo Go / Web / Development Build 兼容性）
  let config: FirebaseConfig | undefined;
  
  try {
    config = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
  } catch {
    // Constants.expoConfig 可能在某些环境下不可用
  }
  
  // 备用：直接内嵌配置（生产环境应使用环境变量）
  if (!config) {
    config = {
      apiKey: "AIzaSyAmoDGDdnjmtK3MRNu4iECbBzsQ595wJ0c",
      authDomain: "fittrack-prod-39e72.firebaseapp.com",
      projectId: "fittrack-prod-39e72",
      storageBucket: "fittrack-prod-39e72.firebasestorage.app",
      messagingSenderId: "659723342601",
      appId: "1:659723342601:web:f86d1deeff79fd8813f9d8"
    };
  }
  
  if (!config || !config.apiKey || config.apiKey === 'YOUR_API_KEY') {
    throw new Error('Firebase 未配置');
  }
  return config;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (app) return { app, auth: auth!, db: db! };
  const config = getFirebaseConfig();
  app = getApps().length ? getApp() : initializeApp(config);
  if (!app) throw new Error('Firebase app 初始化失败');
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
