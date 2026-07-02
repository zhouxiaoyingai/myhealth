import { describe, expect, it } from 'vitest';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import { summarizeDailyReview } from '@/domain/historyReview';
import type { DailyLog } from '@/domain/types';

describe('history review summary', () => {
  it('summarizes gaps between advice and actual check-ins', () => {
    const advice = generateAdvice(sampleProfile, '2026-06-30');
    const log: DailyLog = {
      date: '2026-06-30',
      mealsActual: {
        breakfast: '燕麦酸奶',
        lunch: '',
        dinner: '鸡胸肉沙拉',
        snack: '',
      },
      exerciseActual: {
        type: '快走',
        minutes: Math.max(0, advice.exercise.minutes - 10),
        intensity: '中等',
        note: '',
      },
      mood: 2,
      moodNote: '压力有点大',
      updatedAt: '2026-06-30T08:00:00.000Z',
    };

    const review = summarizeDailyReview(advice, log);

    expect(review.insights).toContain('午餐未记录');
    expect(review.insights).toContain('运动比建议少 10 分钟');
    expect(review.insights).toContain('体重未记录');
    expect(review.insights).toContain('心情偏低，建议降低训练强度或早点休息');
  });

  it('returns a clear empty state when the selected date has no advice or log', () => {
    const review = summarizeDailyReview(undefined, undefined);

    expect(review.insights).toEqual(['当天暂无建议和打卡记录']);
  });

  it('adds completion rate, trend, completeness, and a next-day recommendation when recent logs are provided', () => {
    const advice = generateAdvice(sampleProfile, '2026-06-30');
    const selectedLog: DailyLog = {
      date: '2026-06-30',
      mealsActual: {
        breakfast: '燕麦酸奶',
        lunch: '',
        dinner: '鸡胸肉沙拉',
        snack: '',
      },
      exerciseActual: {
        type: advice.exercise.type,
        minutes: Math.round(advice.exercise.minutes * 0.7),
        intensity: advice.exercise.intensity,
        note: '',
      },
      weightKg: 64.2,
      mood: 2,
      moodNote: '累',
      updatedAt: '2026-06-30T08:00:00.000Z',
    };
    const recentLogs: DailyLog[] = [
      buildLog('2026-06-24', { weightKg: 65, mood: 4, meals: ['早餐', '午餐', '晚餐'] }),
      buildLog('2026-06-25', { weightKg: 64.9, mood: 4, meals: ['早餐', '', '晚餐'] }),
      buildLog('2026-06-26', { weightKg: 64.8, mood: 3, meals: ['', '午餐', '晚餐'] }),
      buildLog('2026-06-27', { weightKg: 64.7, mood: 4, meals: ['早餐', '午餐', ''] }),
      buildLog('2026-06-28', { weightKg: 64.6, mood: 2, meals: ['早餐', '', '晚餐'] }),
      buildLog('2026-06-29', { weightKg: 64.4, mood: 2, meals: ['早餐', '午餐', '晚餐'] }),
      selectedLog,
    ];

    const review = summarizeDailyReview(advice, selectedLog, { recentLogs, selectedDate: '2026-06-30' });

    expect(review.insights).toContain('运动完成率 70%');
    expect(review.insights).toContain('最近 3 次心情偏低，建议降低训练压力');
    expect(review.insights).toContain('最近 7 天体重下降 0.8kg，节奏正常');
    expect(review.insights).toContain('本周三餐记录完整率 76%');
    expect(review.recommendation).toBe(`明天优先补齐午餐记录，运动保持 ${advice.exercise.minutes} 分钟${advice.exercise.type}即可。`);
  });
});

function buildLog(
  date: string,
  options: { weightKg: number; mood: DailyLog['mood']; meals: [string, string, string] },
): DailyLog {
  return {
    date,
    mealsActual: {
      breakfast: options.meals[0],
      lunch: options.meals[1],
      dinner: options.meals[2],
      snack: '',
    },
    exerciseActual: {
      type: '',
      minutes: 0,
      intensity: '',
      note: '',
    },
    weightKg: options.weightKg,
    mood: options.mood,
    moodNote: '',
    updatedAt: `${date}T08:00:00.000Z`,
  };
}
