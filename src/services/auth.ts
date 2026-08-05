import * as SecureStore from 'expo-secure-store';
import { getGithubUser } from './gist';

const PAT_KEY = 'fitness-tracker-pat';

// 保存 PAT 并验证，返回 GitHub 用户名
export async function savePat(pat: string): Promise<string> {
  const trimmed = pat.trim();
  if (!trimmed) throw new Error('PAT 不能为空');
  // 先验证 PAT 有效性
  const user = await getGithubUser(trimmed);
  // 验证通过再保存
  await SecureStore.setItemAsync(PAT_KEY, trimmed);
  return user.login;
}

export async function getPat(): Promise<string | null> {
  return SecureStore.getItemAsync(PAT_KEY);
}

export async function clearPat(): Promise<void> {
  await SecureStore.deleteItemAsync(PAT_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const pat = await getPat();
  return !!pat;
}
