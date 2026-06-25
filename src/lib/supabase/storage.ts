// 约定：storage key 形如 `<userId>/<date>/<slot>.png`，slot ∈ {diet, exercise}
export type ImageSlot = 'diet' | 'exercise';

const KEY_PATTERN = /^([0-9a-f-]{36})\/(\d{4}-\d{2}-\d{2})\/(diet|exercise)\.png$/i;

export function buildStoragePath(userId: string, date: string, slot: ImageSlot): string {
  return `${userId}/${date}/${slot}.png`;
}

export function parseStorageKey(key: string): { userId: string; date: string; slot: ImageSlot } | null {
  const m = KEY_PATTERN.exec(key);
  if (!m) return null;
  return { userId: m[1], date: m[2], slot: m[3].toLowerCase() as ImageSlot };
}

/**
 * 服务端：把远程图片（豆包临时 URL）下载下来，上传到 Supabase Storage。
 * 失败时返回 null，调用方继续走 fallback。
 */
export async function uploadImageFromUrl(
  supabase: ReturnType<typeof import('./admin').createAdminSupabase>,
  params: { sourceUrl: string; userId: string; date: string; slot: ImageSlot }
): Promise<string | null> {
  const { sourceUrl, userId, date, slot } = params;
  if (!supabase) return null;

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType });

    const path = buildStoragePath(userId, date, slot);
    const { error } = await supabase.storage.from('advices').upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[storage] upload failed', error);
      return null;
    }
    return path;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[storage] upload threw', err);
    return null;
  }
}

/**
 * 服务端：根据 storage key 拿一个短时 signed URL（默认 1h），供前端 / 导出使用。
 */
export async function getSignedImageUrl(
  supabase: ReturnType<typeof import('./admin').createAdminSupabase>,
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('advices').createSignedUrl(key, expiresIn);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[storage] sign failed', error);
    return null;
  }
  return data.signedUrl;
}
