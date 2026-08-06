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
  const config = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
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
