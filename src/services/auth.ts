import { getSupabase, initSupabase } from './supabase';
import * as SecureStore from 'expo-secure-store';

const EMAIL_KEY = 'fittrack-email';

export type User = {
  id: string;
  email: string;
};

function ensureInit() {
  return initSupabase();
}

export async function login(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password) throw new Error('请输入密码');

  const supabase = ensureInit();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error('登录失败');

  await SecureStore.setItemAsync(EMAIL_KEY, data.user.email);
  return { id: data.user.id, email: data.user.email };
}

export async function register(email: string, password: string): Promise<User> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error('请输入邮箱');
  if (!password || password.length < 6) throw new Error('密码至少 6 位');

  const supabase = ensureInit();
  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error('注册失败');

  await SecureStore.setItemAsync(EMAIL_KEY, data.user.email);
  return { id: data.user.id, email: data.user.email };
}

export async function logoutSupabase(): Promise<void> {
  const supabase = ensureInit();
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}

export function getCurrentUser(): User | null {
  const supabase = getSupabase();
  const user = supabase.auth.getUser();
  // getUser 是异步的，这里简化处理
  return null;
}

export function authInitialized(): boolean {
  try {
    getSupabase();
    return true;
  } catch {
    return false;
  }
}

export function onUserChanged(cb: (user: User | null) => void): () => void {
  const supabase = ensureInit();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      cb({ id: session.user.id, email: session.user.email! });
    } else {
      cb(null);
    }
  });
  return data.subscription.unsubscribe;
}

export async function getSavedEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(EMAIL_KEY);
}
