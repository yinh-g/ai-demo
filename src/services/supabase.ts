import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

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
      persistSession: true,
      autoRefreshToken: true,
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
