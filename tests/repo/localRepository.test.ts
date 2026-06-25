import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRepository } from '@/lib/repo/local';
import { sampleProfile } from '@/domain/advice';
import type { DailyLog } from '@/domain/types';
import { today } from '@/lib/date';

describe('LocalRepository 契约', () => {
  let repo: LocalRepository;

  beforeEach(() => {
    window.localStorage.clear();
    repo = new LocalRepository();
  });

  it('默认空：profile / advice / log 都是 null', async () => {
    expect(await repo.getProfile()).toBeNull();
    expect(await repo.getAdvice(today())).toBeNull();
    expect(await repo.getLog(today())).toBeNull();
  });

  it('saveProfile + getProfile 往返一致', async () => {
    await repo.saveProfile(sampleProfile);
    const got = await repo.getProfile();
    expect(got).toEqual(sampleProfile);
  });

  it('getAdvice / saveAdvice 往返', async () => {
    const date = today();
    const advice = {
      date,
      summary: 'sum',
      meals: [],
      exercise: { type: '走路', minutes: 30, intensity: '轻松', note: 'no' },
      metrics: {
        bmr: 1,
        tdee: 2,
        targetCalories: 3,
        protein: 4,
        carbs: 5,
        fat: 6,
        bmi: 7,
      },
      source: 'local' as const,
    };
    await repo.saveAdvice(advice);
    const got = await repo.getAdvice(date);
    expect(got).toEqual(advice);
  });

  it('upsertLog 多次同日期会覆盖', async () => {
    const date = today();
    const log: DailyLog = {
      date,
      mealsActual: { breakfast: 'a', lunch: '', dinner: '', snack: '' },
      exerciseActual: { type: '', minutes: 0, intensity: '轻松', note: '' },
      mood: 4,
      moodNote: '',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    await repo.upsertLog(log);
    const updated = await repo.getLog(date);
    expect(updated?.mealsActual.breakfast).toBe('a');
    expect(updated?.updatedAt).not.toBe('2025-01-01T00:00:00.000Z'); // upsert 自动改时间
  });

  it('listAdvices 按日期降序', async () => {
    await repo.saveAdvice({
      date: '2025-01-01',
      summary: '',
      meals: [],
      exercise: { type: '', minutes: 0, intensity: '', note: '' },
      metrics: { bmr: 0, tdee: 0, targetCalories: 0, protein: 0, carbs: 0, fat: 0, bmi: 0 },
      source: 'local',
    });
    await repo.saveAdvice({
      date: '2025-01-03',
      summary: '',
      meals: [],
      exercise: { type: '', minutes: 0, intensity: '', note: '' },
      metrics: { bmr: 0, tdee: 0, targetCalories: 0, protein: 0, carbs: 0, fat: 0, bmi: 0 },
      source: 'local',
    });
    const list = await repo.listAdvices();
    expect(list.map((a) => a.date)).toEqual(['2025-01-03', '2025-01-01']);
  });

  it('clear 清空 localStorage', async () => {
    await repo.saveProfile(sampleProfile);
    await repo.clear();
    expect(await repo.getProfile()).toBeNull();
  });

  it('exportJson 返回有效 JSON', async () => {
    await repo.saveProfile(sampleProfile);
    const json = await repo.exportJson();
    expect(JSON.parse(json).profile).toEqual(sampleProfile);
  });
});
