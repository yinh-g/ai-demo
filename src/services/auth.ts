import { getFirebase, initFirebase } from './firebase';
import * as SecureStore from 'expo-secure-store';

const EMAIL_KEY = 'fittrack-email';

export type User = firebase.User;

function ensureInit() {
  try {
    const firebase = initFirebase();
    if (!firebase || !firebase.auth) {
      throw new Error('Firebase 初始化返回空值');
    }
    return firebase;
  } catch (e: any) {
    console.error('ensureInit failed:', e);
    throw new Error('Firebase 初始化失败: ' + (e?.message || '未知错误'));
  }
}

export async function login(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password) throw new Error('请输入密码');

  const firebase = ensureInit();
  const cred = await firebase.auth.signInWithEmailAndPassword(trimmedEmail, password);
  if (cred.user?.email) {
    await SecureStore.setItemAsync(EMAIL_KEY, cred.user.email);
  }
  return cred.user!;
}

export async function register(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password || password.length < 6) throw new Error('密码至少 6 位');

  const firebase = ensureInit();
  const cred = await firebase.auth.createUserWithEmailAndPassword(trimmedEmail, password);
  if (cred.user?.email) {
    await SecureStore.setItemAsync(EMAIL_KEY, cred.user.email);
  }
  return cred.user!;
}

export async function logoutFirebase(): Promise<void> {
  const firebase = ensureInit();
  await firebase.auth.signOut();
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}

export function getCurrentUser(): User | null {
  if (!authInitialized()) return null;
  try {
    const firebase = getFirebase();
    return firebase.auth.currentUser;
  } catch {
    return null;
  }
}

export function authInitialized(): boolean {
  try {
    const firebase = getFirebase();
    return !!(firebase && firebase.auth);
  } catch {
    return false;
  }
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  const firebase = ensureInit();
  return firebase.auth.onAuthStateChanged(cb);
}

export async function getSavedEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(EMAIL_KEY);
}
