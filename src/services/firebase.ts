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
  let config: FirebaseConfig | undefined;
  
  try {
    config = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
  } catch {
    // Constants.expoConfig 可能在某些环境下不可用
  }
  
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
  if (app && auth && db) {
    return { app, auth, db };
  }
  
  const config = getFirebaseConfig();
  
  // 总是重新初始化，避免 getApp() 返回未注册 auth 的实例
  if (!app) {
    if (getApps().length > 0) {
      // 如果已有 app，尝试获取，但可能需要重新初始化
      try {
        app = getApp();
      } catch {
        app = initializeApp(config);
      }
    } else {
      app = initializeApp(config);
    }
  }
  
  if (!app) {
    throw new Error('Firebase app 初始化失败');
  }
  
  // 直接获取 auth，不要条件判断
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error('getAuth failed:', e);
    throw new Error('Firebase Auth 初始化失败: ' + (e as any)?.message);
  }
  
  if (!db) {
    db = getFirestore(app);
  }
  
  return { app, auth, db };
}

export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!app || !auth || !db) {
    return initFirebase();
  }
  return { app, auth, db };
}

export function isFirebaseConfigured(): boolean {
  try {
    const extra = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
    return !!(extra?.apiKey && extra.apiKey !== 'YOUR_API_KEY' && extra.projectId && extra.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return true; // 有备用配置，总是返回 true
  }
}
