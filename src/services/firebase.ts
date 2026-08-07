import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
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

let app: firebase.app.App | null = null;

export function initFirebase(): { app: firebase.app.App; auth: firebase.auth.Auth; db: firebase.firestore.Firestore } {
  if (app) {
    return { app, auth: app.auth(), db: app.firestore() };
  }

  const config = getFirebaseConfig();

  if (firebase.apps.length > 0) {
    app = firebase.app();
  } else {
    app = firebase.initializeApp(config);
  }

  if (!app) {
    throw new Error('Firebase app 初始化失败');
  }

  return { app, auth: app.auth(), db: app.firestore() };
}

export function getFirebase(): { app: firebase.app.App; auth: firebase.auth.Auth; db: firebase.firestore.Firestore } {
  if (!app) {
    return initFirebase();
  }
  return { app, auth: app.auth(), db: app.firestore() };
}

export function isFirebaseConfigured(): boolean {
  try {
    const extra = Constants.expoConfig?.extra?.firebase as FirebaseConfig | undefined;
    return !!(extra?.apiKey && extra.apiKey !== 'YOUR_API_KEY' && extra.projectId && extra.projectId !== 'YOUR_PROJECT_ID');
  } catch {
    return true;
  }
}
