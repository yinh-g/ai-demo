import { getSupabase, isSupabaseConfigured } from './supabase';
import { getCurrentUser } from './auth';

// 统一 bucket 名，禁止在代码里硬编码分散
export const AVATAR_BUCKET = 'avatars';

// 头像存储路径：{userId}/avatar-{timestamp}.jpg
function buildObjectKey(uid: string): string {
  return `${uid}/avatar-${Date.now()}.jpg`;
}

// 从 Supabase Storage 的 publicUrl / signedUrl 中提取对象键
// 用于删除旧文件：public URL 形如
// https://pnncwyozewabagebdgxv.supabase.co/storage/v1/object/public/avatars/xxx/avatar-yyy.jpg
//                              或 /object/sign/avatars/...
function extractBucketAndKey(url: string): { bucket: string; key: string } | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/[^/]+\/([^/]+)\/(.+)$/);
    if (match) {
      return { bucket: decodeURIComponent(match[1]), key: decodeURIComponent(match[2]) };
    }
    return null;
  } catch {
    return null;
  }
}

// 判断 URI 是否是本地文件（需要上传）
export function isLocalUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('content://');
}

// 判断 URI 是否是云端 URL（已经上传成功过，不需再传）
export function isRemoteUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith('https://') || uri.startsWith('http://');
}

// 把本地 file:// URI 读成 ArrayBuffer
async function uriToBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('读取本地图片失败');
  return await res.arrayBuffer();
}

// 上传本地头像到 Supabase Storage，返回公开访问 URL
export async function uploadAvatar(localUri: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法上传头像');
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('未登录，无法上传头像');
  }

  const supabase = getSupabase();
  const key = buildObjectKey(user.id);
  const buf = await uriToBuffer(localUri);

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(key, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    // 常见：bucket 不存在 → 给出更明确的报错
    if (error.message.includes('Bucket not found') || error.name === 'StorageBucketNotFoundError') {
      throw new Error(`存储桶「${AVATAR_BUCKET}」不存在，请先在 Supabase 控制台 Storage → New bucket 创建同名 bucket`);
    }
    throw new Error(error.message || '头像上传失败');
  }

  // 用 getPublicUrl 拿到可跨设备访问的公开地址
  const { data: publicData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// 删除旧头像（如果能解析出 bucket + key）
// 删除失败只打日志，不影响主流程
export async function deleteOldAvatar(remoteUrl: string | null | undefined): Promise<void> {
  if (!remoteUrl || !isRemoteUrl(remoteUrl)) return;
  if (!isSupabaseConfigured()) return;

  const parsed = extractBucketAndKey(remoteUrl);
  if (!parsed) return;
  if (parsed.bucket !== AVATAR_BUCKET) return;

  try {
    const supabase = getSupabase();
    await supabase.storage.from(parsed.bucket).remove([parsed.key]);
  } catch (e) {
    console.warn('deleteOldAvatar failed (ignored):', e);
  }
}
