import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

let supabase: SupabaseClient | null = null;

function getSupabaseConfig() {
  const extra = Constants.expoConfig?.extra?.supabase as { url: string; anonKey: string } | undefined;
  if (!extra?.url || !extra?.anonKey) {
    throw new Error('Supabase 未配置');
  }
  return extra;
}

export function initSupabase(): SupabaseClient {
  if (supabase) return supabase;
  const config = getSupabaseConfig();
  supabase = createClient(config.url, config.anonKey, {
    auth: {
      // 关键：React Native 没有 localStorage，必须显式指定 AsyncStorage
      // 否则 persistSession:true 会静默失败，session 不被持久化，每次重启都要重新登录
      persistSession: true,
      autoRefreshToken: true,
      storage: AsyncStorage,
    },
  });
  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) return initSupabase();
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  try {
    const extra = Constants.expoConfig?.extra?.supabase as { url: string; anonKey: string } | undefined;
    return !!(extra?.url && extra?.anonKey);
  } catch {
    return false;
  }
}
