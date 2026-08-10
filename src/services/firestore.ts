import { getSupabase, initSupabase } from './supabase';
import { getCurrentUser } from './auth';

const TABLE = 'user_data';

export interface CloudState {
  schemaVersion: number;
  updatedAt: number;
  updatedAtByDevice: string;
  data: Record<string, unknown>;
}

function ensureInit() {
  return initSupabase();
}

export async function readCloudState(): Promise<CloudState | null> {
  ensureInit();
  const user = await getCurrentUser();
  if (!user) throw new Error('未登录');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 未找到
    throw new Error(error.message);
  }

  return data?.data as CloudState || null;
}

export async function writeCloudState(payload: CloudState): Promise<void> {
  ensureInit();
  const user = await getCurrentUser();
  if (!user) throw new Error('未登录');

  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      user_id: user.id,
      data: payload,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
}
