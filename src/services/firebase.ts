import { initializeApp, FirebaseApp, getApps, getApp, deleteApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
let initAttempted = false;

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (app && auth && db) {
    return { app, auth, db };
  }

  const config = getFirebaseConfig();

  // 如果之前有失败的初始化，清理并重新开始
  if (initAttempted && !auth) {
    try {
      const existingApps = getApps();
      existingApps.forEach((existingApp) => {
        deleteApp(existingApp);
      });
    } catch {
      // 忽略清理错误
    }
    app = null;
    auth = null;
    db = null;
    initAttempted = false;
  }

  if (!app) {
    if (getApps().length > 0) {
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

  // 使用 initializeAuth 而不是 getAuth
  if (!auth) {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (e: any) {
      // 如果已经初始化过，使用 getAuth
      if (e.message?.includes('already')) {
        auth = getAuth(app);
      } else {
        console.error('initializeAuth failed:', e);
        throw new Error('Firebase Auth 初始化失败: ' + e?.message);
      }
    }
  }

  if (!db) {
    db = getFirestore(app);
  }

  initAttempted = true;
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
