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
});
