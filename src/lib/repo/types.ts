import type { Advice, DailyLog, Profile, Settings } from '@/domain/types';

export type RepositoryMode = 'local' | 'supabase';

export interface Repository {
  readonly mode: RepositoryMode;
  // profile
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  // advice
  getAdvice(date: string): Promise<Advice | null>;
  saveAdvice(advice: Advice): Promise<void>;
  listAdvices(limit?: number): Promise<Advice[]>;
  // log
  getLog(date: string): Promise<DailyLog | null>;
  upsertLog(log: DailyLog): Promise<void>;
  listLogs(limit?: number): Promise<DailyLog[]>;
  // settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  // 维护
  exportJson(): Promise<string>;
  clear(): Promise<void>;
}

// DB row shape（snake_case） — Supabase / Postgres
export type DbProfileRow = {
  id: string;
  gender: Profile['gender'];
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: Profile['goal'];
  activity: Profile['activity'];
  diet: Profile['dietPlan'];
  notes: string;
  updated_at: string;
};

export type DbAdviceImages = {
  dietKey?: string;
  exerciseKey?: string;
  source: 'doubao' | 'fallback';
  error?: string;
};

export type DbAdviceRow = {
  id: string;
  user_id: string;
  date: string;
  source: Advice['source'] | 'doubao';
  summary: string;
  meals: Advice['meals'];
  exercise: Advice['exercise'];
  metrics: Advice['metrics'];
  images: DbAdviceImages | null;
  image_prompts: { diet: string; exercise: string } | null;
  warning: string | null;
  created_at: string;
  updated_at: string;
};

export type DbLogRow = {
  id: string;
  user_id: string;
  date: string;
  meals_actual: DailyLog['mealsActual'] | null;
  exercise_actual: DailyLog['exerciseActual'] | null;
  weight_kg: number | null;
  mood: DailyLog['mood'] | null;
  mood_note: string;
  updated_at: string;
};

// 转换函数：DB row → 应用层类型
export function rowToProfile(row: DbProfileRow): Profile {
  return {
    gender: row.gender,
    age: row.age,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    goal: row.goal,
    activity: row.activity,
    dietPlan: row.diet,
    notes: row.notes,
  };
}

export function profileToRow(profile: Profile, id: string): DbProfileRow {
  return {
    id,
    gender: profile.gender,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    goal: profile.goal,
    activity: profile.activity,
    diet: profile.dietPlan,
    notes: profile.notes,
    updated_at: new Date().toISOString(),
  };
}

export function rowToAdvice(row: DbAdviceRow): Advice {
  return {
    date: row.date,
    summary: row.summary,
    meals: row.meals,
    exercise: row.exercise,
    metrics: row.metrics,
    source: row.source === 'doubao' ? 'fallback' : row.source, // 'doubao' 在客户端降级为 'fallback'（images 里有 source）
    warning: row.warning ?? undefined,
    images: row.images
      ? {
          dietKey: row.images.dietKey,
          exerciseKey: row.images.exerciseKey,
          source: row.images.source,
          error: row.images.error,
        }
      : undefined,
  };
}

export function adviceToRow(advice: Advice, userId: string, id?: string): Omit<DbAdviceRow, 'created_at' | 'updated_at'> {
  return {
    id: id ?? cryptoRandomUuid(),
    user_id: userId,
    date: advice.date,
    source: advice.source === 'fallback' ? 'fallback' : 'local',
    summary: advice.summary,
    meals: advice.meals,
    exercise: advice.exercise,
    metrics: advice.metrics,
    images: advice.images
      ? {
          dietKey: advice.images.dietKey,
          exerciseKey: advice.images.exerciseKey,
          source: advice.images.source,
          error: advice.images.error,
        }
      : null,
    image_prompts: null,
    warning: advice.warning ?? null,
  };
}

export function rowToLog(row: DbLogRow): DailyLog {
  return {
    date: row.date,
    mealsActual: row.meals_actual ?? { breakfast: '', lunch: '', dinner: '', snack: '' },
    exerciseActual: row.exercise_actual ?? { type: '', minutes: 0, intensity: '', note: '' },
    weightKg: row.weight_kg ?? undefined,
    mood: row.mood ?? undefined,
    moodNote: row.mood_note,
    updatedAt: row.updated_at,
  };
}

export function logToRow(log: DailyLog, userId: string, id?: string): Omit<DbLogRow, 'updated_at'> {
  return {
    id: id ?? cryptoRandomUuid(),
    user_id: userId,
    date: log.date,
    meals_actual: log.mealsActual,
    exercise_actual: log.exerciseActual,
    weight_kg: log.weightKg ?? null,
    mood: log.mood ?? null,
    mood_note: log.moodNote,
  };
}

// crypto 在浏览器和现代 Node 都可用；这里是兜底
function cryptoRandomUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // 极端兜底
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
