import { beforeEach, describe, expect, it } from 'vitest';
import { getLocalMigrationSummary, migrateLocalToSupabase, readLocalDb } from '@/lib/repo/migrate';
import { sampleProfile } from '@/domain/advice';
import type { Advice, DailyLog } from '@/domain/types';

const STORAGE_KEY = 'myhealth.local.v1';

function seedLocal() {
  const advice: Advice = {
    date: '2025-01-02',
    summary: 'sum',
    meals: [
      { name: '早餐', items: 'oat', protein: 10, calories: 200 },
      { name: '午餐', items: 'salad', protein: 20, calories: 400 },
      { name: '晚餐', items: 'fish', protein: 30, calories: 500 },
    ],
    exercise: { type: '走路', minutes: 30, intensity: '轻松', note: '' },
    metrics: { bmr: 0, tdee: 0, targetCalories: 0, protein: 0, carbs: 0, fat: 0, bmi: 0 },
    source: 'fallback',
    images: { source: 'fallback' },
  };
  const log: DailyLog = {
    date: '2025-01-02',
    mealsActual: { breakfast: 'a', lunch: '', dinner: '', snack: '' },
    exerciseActual: { type: '', minutes: 0, intensity: '轻松', note: '' },
    mood: 4,
    moodNote: '',
    updatedAt: '2025-01-02T00:00:00.000Z',
  };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ profile: sampleProfile, advices: { '2025-01-02': advice }, logs: { '2025-01-02': log } }),
  );
}

function createFakeSupabase(impl: (table: string, op: 'upsert') => { error: { message: string } | null } | null) {
  const calls: Array<{ table: string; op: string; payload: unknown }> = [];
  return {
    calls,
    client: {
      from(table: string) {
        return {
          upsert(payload: unknown) {
            calls.push({ table, op: 'upsert', payload });
            const r = impl ? impl(table, 'upsert') : { error: null };
            return Promise.resolve({ error: r ? r.error : null });
          },
        };
      },
    },
  };
}

describe('migrateLocalToSupabase', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('没有 supabase client → 返回 no-client 错误', async () => {
    const result = await migrateLocalToSupabase(null, 'user-1', 'all');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('no-client');
  });

  it('没有 user → 返回 no-user 错误', async () => {
    const { client } = createFakeSupabase(() => null);
    const result = await migrateLocalToSupabase(client, null, 'all');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('no-user');
  });

  it('local 没数据 → 返回 no-data 错误', async () => {
    const { client } = createFakeSupabase(() => null);
    const result = await migrateLocalToSupabase(client, 'user-1', 'all');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('no-data');
  });

  it('mode=skip → ok=true 但什么都没做', async () => {
    const { client, calls } = createFakeSupabase(() => null);
    seedLocal();
    const result = await migrateLocalToSupabase(client, 'user-1', 'skip');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.profileCopied).toBe(false);
      expect(calls.length).toBe(0);
    }
  });

  it('mode=profile-only → 只写 profiles 表，保留本地', async () => {
    const { client, calls } = createFakeSupabase(() => null);
    seedLocal();
    const result = await migrateLocalToSupabase(client, 'user-1', 'profile-only');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.profileCopied).toBe(true);
      expect(result.summary.adviceCount).toBe(0);
      expect(result.summary.logCount).toBe(0);
      expect(result.summary.clearedLocal).toBe(false);
    }
    const tables = calls.map((c) => c.table);
    expect(tables).toEqual(['profiles']);
    // 本地还在
    expect(readLocalDb().advices['2025-01-02']).toBeDefined();
  });

  it('mode=all → 写三张表 + 清空本地', async () => {
    const { client, calls } = createFakeSupabase(() => null);
    seedLocal();
    const result = await migrateLocalToSupabase(client, 'user-1', 'all');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.profileCopied).toBe(true);
      expect(result.summary.adviceCount).toBe(1);
      expect(result.summary.logCount).toBe(1);
      expect(result.summary.clearedLocal).toBe(true);
    }
    const tables = calls.map((c) => c.table);
    expect(tables).toContain('profiles');
    expect(tables).toContain('daily_advices');
    expect(tables).toContain('daily_logs');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('upsert 报错 → 返回 exception 错误', async () => {
    const { client } = createFakeSupabase((table) =>
      table === 'profiles' ? { error: { message: 'boom' } } : { error: null },
    );
    seedLocal();
    const result = await migrateLocalToSupabase(client, 'user-1', 'all');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('exception');
      expect(String(result.error.message)).toContain('boom');
    }
  });
});

describe('getLocalMigrationSummary', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('返回本地可迁移数据数量', () => {
    seedLocal();

    expect(getLocalMigrationSummary()).toEqual({
      hasAny: true,
      hasProfile: true,
      profileCount: 1,
      adviceCount: 1,
      logCount: 1,
    });
  });
});
