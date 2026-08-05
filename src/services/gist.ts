import { getPat } from './auth';

const API = 'https://api.github.com';
// Gist 描述固定，便于在用户所有 gist 中查找
export const GIST_DESC = 'FitTrack Cloud State';
export const STATE_FILE = 'state.json';

export interface GithubUser {
  login: string;
  id: number;
  avatar_url?: string;
}

interface GistFile {
  filename: string;
  content: string;
}

interface GistResponse {
  id: string;
  description: string | null;
  files: Record<string, { filename: string; content?: string }>;
}

async function authHeaders(patOverride?: string): Promise<HeadersInit> {
  const pat = patOverride ?? (await getPat());
  if (!pat) throw new Error('未登录，缺少 PAT');
  return {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

// 验证 PAT 并返回用户信息（不依赖本地存储，可在登录前调用）
export async function getGithubUser(pat: string): Promise<GithubUser> {
  const res = await fetch(`${API}/user`, {
    headers: {
      Authorization: `token ${pat.trim()}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 401) throw new Error('PAT 无效或已过期');
  if (!res.ok) throw new Error(`验证 PAT 失败：${res.status}`);
  return res.json();
}

// 在用户的所有 gist 中查找 FitTrack 同步用的 gist
export async function findFittrackGist(): Promise<string | null> {
  const h = await authHeaders();
  // 翻页查找（一般用户 gist 不多，1-2 页就够）
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${API}/gists?per_page=100&page=${page}`, { headers: h });
    if (!res.ok) throw new Error(`列出 gist 失败：${res.status}`);
    const list: GistResponse[] = await res.json();
    if (list.length === 0) break;
    const found = list.find((g) => g.description === GIST_DESC);
    if (found) return found.id;
    if (list.length < 100) break; // 最后一页
  }
  return null;
}

// 创建新 gist，返回 gist id
export async function createGist(content: string): Promise<string> {
  const h = await authHeaders();
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      description: GIST_DESC,
      public: false, // secret gist
      files: { [STATE_FILE]: { content } },
    }),
  });
  if (!res.ok) throw new Error(`创建 gist 失败：${res.status}`);
  const data: GistResponse = await res.json();
  return data.id;
}

// 读取 gist 中 state.json 的内容
export async function getGistContent(gistId: string): Promise<string | null> {
  const h = await authHeaders();
  const res = await fetch(`${API}/gists/${gistId}`, { headers: h });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`读取 gist 失败：${res.status}`);
  const data: GistResponse = await res.json();
  return data.files?.[STATE_FILE]?.content ?? null;
}

// 更新 gist 中 state.json 的内容
export async function updateGist(gistId: string, content: string): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      files: { [STATE_FILE]: { content } },
    }),
  });
  if (!res.ok) throw new Error(`更新 gist 失败：${res.status}`);
}
