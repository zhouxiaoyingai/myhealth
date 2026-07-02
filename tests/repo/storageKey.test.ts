import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildStoragePath, parseStorageKey, uploadImageFromUrl } from '@/lib/supabase/storage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('storage key 工具', () => {
  it('buildStoragePath 拼出 <userId>/<date>/<slot>.png', () => {
    expect(buildStoragePath('00000000-0000-0000-0000-000000000000', '2025-01-02', 'diet')).toBe(
      '00000000-0000-0000-0000-000000000000/2025-01-02/diet.png',
    );
    expect(buildStoragePath('abc', '2025-12-31', 'exercise')).toBe('abc/2025-12-31/exercise.png');
  });

  it('parseStorageKey 解析合法 key', () => {
    const parsed = parseStorageKey('00000000-0000-0000-0000-000000000000/2025-01-02/diet.png');
    expect(parsed).toEqual({
      userId: '00000000-0000-0000-0000-000000000000',
      date: '2025-01-02',
      slot: 'diet',
    });
  });

  it('parseStorageKey 大小写不敏感', () => {
    const parsed = parseStorageKey('00000000-0000-0000-0000-000000000000/2025-01-02/EXERCISE.PNG');
    expect(parsed?.slot).toBe('exercise');
  });

  it('parseStorageKey 拒绝非法 key', () => {
    expect(parseStorageKey('not-a-key')).toBeNull();
    expect(parseStorageKey('00000000-0000-0000-0000-000000000000/2025-01-02/wrong.png')).toBeNull();
    expect(parseStorageKey('00000000-0000-0000-0000-000000000000/not-a-date/diet.png')).toBeNull();
  });
  it('retries fetching a generated image once before uploading to Storage', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, headers: new Headers() })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      });
    vi.stubGlobal('fetch', fetchMock);
    const uploadMock = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      storage: {
        from: () => ({
          upload: uploadMock,
        }),
      },
    };

    const key = await uploadImageFromUrl(supabase as never, {
      sourceUrl: 'https://example.com/diet.png',
      userId: '00000000-0000-0000-0000-000000000000',
      date: '2026-06-30',
      slot: 'diet',
    });

    expect(key).toBe('00000000-0000-0000-0000-000000000000/2026-06-30/diet.png');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('retries Storage upload once when the first upload fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      }),
    );
    const uploadMock = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'temporary storage failure' } })
      .mockResolvedValueOnce({ error: null });
    const supabase = {
      storage: {
        from: () => ({
          upload: uploadMock,
        }),
      },
    };

    const key = await uploadImageFromUrl(supabase as never, {
      sourceUrl: 'https://example.com/exercise.png',
      userId: '00000000-0000-0000-0000-000000000000',
      date: '2026-06-30',
      slot: 'exercise',
    });

    expect(key).toBe('00000000-0000-0000-0000-000000000000/2026-06-30/exercise.png');
    expect(uploadMock).toHaveBeenCalledTimes(2);
  });
});
