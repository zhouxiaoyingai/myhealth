import type { Advice, DailyLog, Profile, Settings } from '@/domain/types';
import type { Repository } from './types';

const STORAGE_KEY = 'myhealth.local.v1';

type LocalDb = {
  profile?: Profile;
  advices: Record<string, Advice>;
  logs: Record<string, DailyLog>;
  settings: Settings;
};

const empty: LocalDb = {
  advices: {},
  logs: {},
  settings: { theme: 'system' },
};

function readDb(): LocalDb {
  if (typeof window === 'undefined') return structuredClone(empty);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return { ...structuredClone(empty), ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return structuredClone(empty);
  }
}

function writeDb(db: LocalDb): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export class LocalRepository implements Repository {
  readonly mode = 'local' as const;

  async getProfile(): Promise<Profile | null> {
    return readDb().profile ?? null;
  }

  async saveProfile(profile: Profile): Promise<void> {
    const db = readDb();
    db.profile = profile;
    writeDb(db);
  }

  async getAdvice(date: string): Promise<Advice | null> {
    return readDb().advices[date] ?? null;
  }

  async saveAdvice(advice: Advice): Promise<void> {
    const db = readDb();
    db.advices[advice.date] = advice;
    writeDb(db);
  }

  async listAdvices(limit = 30): Promise<Advice[]> {
    const db = readDb();
    return Object.values(db.advices)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit);
  }

  async getLog(date: string): Promise<DailyLog | null> {
    return readDb().logs[date] ?? null;
  }

  async upsertLog(log: DailyLog): Promise<void> {
    const db = readDb();
    db.logs[log.date] = { ...log, updatedAt: new Date().toISOString() };
    writeDb(db);
  }

  async listLogs(limit = 30): Promise<DailyLog[]> {
    const db = readDb();
    return Object.values(db.logs)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, limit);
  }

  async getSettings(): Promise<Settings> {
    return readDb().settings;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const db = readDb();
    db.settings = settings;
    writeDb(db);
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(readDb(), null, 2);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
