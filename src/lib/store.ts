'use client';

import type { Advice, DailyLog, Profile, Settings } from '@/domain/types';

type LocalDatabase = {
  profile?: Profile;
  advices: Record<string, Advice>;
  logs: Record<string, DailyLog>;
  settings: Settings;
};

const storageKey = 'myhealth.local.v1';
const emptyDatabase: LocalDatabase = {
  advices: {},
  logs: {},
  settings: { theme: 'system' },
};

export function readDatabase(): LocalDatabase {
  if (typeof window === 'undefined') return emptyDatabase;

  try {
    return {
      ...emptyDatabase,
      ...JSON.parse(window.localStorage.getItem(storageKey) || '{}'),
    };
  } catch {
    return emptyDatabase;
  }
}

export function writeDatabase(database: LocalDatabase) {
  window.localStorage.setItem(storageKey, JSON.stringify(database));
}

export const repo = {
  getProfile: () => readDatabase().profile,
  saveProfile: (profile: Profile) => {
    const database = readDatabase();
    database.profile = profile;
    writeDatabase(database);
  },
  getAdvice: (date: string) => readDatabase().advices[date],
  saveAdvice: (advice: Advice) => {
    const database = readDatabase();
    database.advices[advice.date] = advice;
    writeDatabase(database);
  },
  getLogs: () => readDatabase().logs,
  upsertLog: (log: DailyLog) => {
    const database = readDatabase();
    database.logs[log.date] = log;
    writeDatabase(database);
  },
  getSettings: () => readDatabase().settings,
  saveSettings: (settings: Settings) => {
    const database = readDatabase();
    database.settings = settings;
    writeDatabase(database);
  },
  exportJson: () => JSON.stringify(readDatabase(), null, 2),
  clear: () => window.localStorage.removeItem(storageKey),
};
