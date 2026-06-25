import { describe, expect, it } from 'vitest';
import { buildStoragePath, parseStorageKey } from '@/lib/supabase/storage';

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
});
