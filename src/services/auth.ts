import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from 'firebase/auth';
import { getFirebase, initFirebase } from './firebase';
import * as SecureStore from 'expo-secure-store';

const EMAIL_KEY = 'fittrack-email';

export type { User };

function ensureInit() {
  try {
    return initFirebase();
  } catch (e) {
    console.error('ensureInit failed:', e);
    throw new Error('Firebase 初始化失败，请检查配置');
  }
}

export async function login(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password) throw new Error('请输入密码');
  const { auth } = ensureInit();
  const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  if (cred.user.email) {
    await SecureStore.setItemAsync(EMAIL_KEY, cred.user.email);
  }
  return cred.user;
}

export async function register(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password || password.length < 6) throw new Error('密码至少 6 位');
  const { auth } = ensureInit();
  const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  if (cred.user.email) {
    await SecureStore.setItemAsync(EMAIL_KEY, cred.user.email);
  }
  return cred.user;
}

export async function logoutFirebase(): Promise<void> {
  const { auth } = ensureInit();
  await signOut(auth);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}

export function getCurrentUser(): User | null {
  if (!authInitialized()) return null;
  const { auth } = getFirebase();
  return auth.currentUser;
}

export function authInitialized(): boolean {
  try {
    getFirebase();
    return true;
  } catch {
    return false;
  }
}

export function onUserChanged(cb: (user: User | null) => void): Unsubscribe {
  const { auth } = ensureInit();
  return onAuthStateChanged(auth, cb);
}

export async function getSavedEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(EMAIL_KEY);
}
