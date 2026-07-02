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
    const response = await fetchImageWithRetry(sourceUrl);
    if (!response) return null;
    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType });

    const path = buildStoragePath(userId, date, slot);
    const uploaded = await uploadBlobWithRetry(supabase, path, blob, contentType);
    if (!uploaded) {
      return null;
    }
    return path;
  } catch (err) {
    console.error('[advise:image:storage] upload threw', err);
    return null;
  }
}

async function fetchImageWithRetry(sourceUrl: string): Promise<Response | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      console.info('[advise:image:fetch] fetching source image', { attempt });
      const response = await fetch(sourceUrl);
      if (response.ok) return response;
      console.error('[advise:image:fetch] source image fetch failed', { attempt, status: response.status });
    } catch (err) {
      console.error('[advise:image:fetch] source image fetch threw', { attempt, err });
    }
  }
  return null;
}

async function uploadBlobWithRetry(
  supabase: NonNullable<ReturnType<typeof import('./admin').createAdminSupabase>>,
  path: string,
  blob: Blob,
  contentType: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { error } = await supabase.storage.from('advices').upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (!error) return true;
    console.error('[advise:image:storage] upload failed', { attempt, error });
  }
  return false;
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
    console.error('[advise:image:signed-url] sign failed', error);
    return null;
  }
  return data.signedUrl;
}
