import type { SupabaseClient } from '@supabase/supabase-js';
import type { Advice, DailyLog, Profile } from '@/domain/types';

type LocalDb = {
  profile?: Profile;
  advices: Record<string, Advice>;
  logs: Record<string, DailyLog>;
};

const LOCAL_KEY = 'myhealth.local.v1';

export function readLocalDb(): LocalDb {
  if (typeof window === 'undefined') return { advices: {}, logs: {} };
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return { advices: {}, logs: {} };
    const parsed = JSON.parse(raw) as LocalDb;
    return {
      profile: parsed.profile,
      advices: parsed.advices ?? {},
      logs: parsed.logs ?? {},
    };
  } catch {
    return { advices: {}, logs: {} };
  }
}

export function clearLocalDb(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_KEY);
}

export function getLocalMigrationSummary(local: LocalDb = readLocalDb()): LocalMigrationSummary {
  const hasProfile = !!local.profile;
  const adviceCount = Object.keys(local.advices).length;
  const logCount = Object.keys(local.logs).length;

  return {
    hasAny: hasProfile || adviceCount > 0 || logCount > 0,
    hasProfile,
    profileCount: hasProfile ? 1 : 0,
    adviceCount,
    logCount,
  };
}

export type MigrateMode = 'all' | 'profile-only' | 'skip';

export type MigrateSummary = {
  profileCopied: boolean;
  adviceCount: number;
  logCount: number;
  clearedLocal: boolean;
};

export type LocalMigrationSummary = {
  hasAny: boolean;
  hasProfile: boolean;
  profileCount: number;
  adviceCount: number;
  logCount: number;
};

export type MigrateError = { kind: 'no-client' | 'no-user' | 'no-data' | 'exception'; message: string };

export type MigrateResult = { ok: true; summary: MigrateSummary } | { ok: false; error: MigrateError };

/**
 * 把 LocalRepository 里的数据迁移到 Supabase。
 * - 'all'         ：profile + advices + logs 全搬，然后清空本地
 * - 'profile-only'：只搬 profile，advices/logs 保留本地
 * - 'skip'        ：什么都不做
 *
 * 不抛异常，所有错误以 MigrateResult.error 返回。
 */
export async function migrateLocalToSupabase(
  supabase: SupabaseClient | null,
  userId: string | null,
  mode: MigrateMode
): Promise<MigrateResult> {
  if (!supabase) {
    return { ok: false, error: { kind: 'no-client', message: 'Supabase 未配置' } };
  }
  if (!userId) {
    return { ok: false, error: { kind: 'no-user', message: '未登录' } };
  }
  if (mode === 'skip') {
    return { ok: true, summary: { profileCopied: false, adviceCount: 0, logCount: 0, clearedLocal: false } };
  }

  const local = readLocalDb();
  if (!getLocalMigrationSummary(local).hasAny) {
    return { ok: false, error: { kind: 'no-data', message: '本地没有数据' } };
  }

  const summary: MigrateSummary = {
    profileCopied: false,
    adviceCount: 0,
    logCount: 0,
    clearedLocal: false,
  };

  try {
    if (local.profile) {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        gender: local.profile.gender,
        age: local.profile.age,
        height_cm: local.profile.heightCm,
        weight_kg: local.profile.weightKg,
        goal: local.profile.goal,
        activity: local.profile.activity,
        diet: local.profile.dietPlan,
        notes: local.profile.notes ?? '',
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      summary.profileCopied = true;
    }

    if (mode === 'all') {
      for (const advice of Object.values(local.advices)) {
        const { error } = await supabase.from('daily_advices').upsert({
          id: crypto.randomUUID(),
          user_id: userId,
          date: advice.date,
          source: advice.source,
          summary: advice.summary,
          meals: advice.meals,
          exercise: advice.exercise,
          metrics: advice.metrics,
          images: advice.images?.dietKey || advice.images?.exerciseKey
            ? {
                dietKey: advice.images.dietKey,
                exerciseKey: advice.images.exerciseKey,
                source: advice.images.source,
                error: advice.images.error,
              }
            : null,
          image_prompts: null,
          warning: advice.warning ?? null,
        });
        if (error) throw error;
        summary.adviceCount += 1;
      }
      for (const log of Object.values(local.logs)) {
        const { error } = await supabase.from('daily_logs').upsert({
          id: crypto.randomUUID(),
          user_id: userId,
          date: log.date,
          meals_actual: log.mealsActual,
          exercise_actual: log.exerciseActual,
          weight_kg: log.weightKg ?? null,
          mood: log.mood ?? null,
          mood_note: log.moodNote ?? '',
        });
        if (error) throw error;
        summary.logCount += 1;
      }
      clearLocalDb();
      summary.clearedLocal = true;
    }

    return { ok: true, summary };
  } catch (err) {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    } else {
      message = String(err);
    }
    return {
      ok: false,
      error: { kind: 'exception', message },
    };
  }
}
