import type { Advice, DailyLog } from './types';

const mealFields = [
  ['早餐', 'breakfast'],
  ['午餐', 'lunch'],
  ['晚餐', 'dinner'],
] as const;

export type DailyReview = {
  insights: string[];
};

export function summarizeDailyReview(advice?: Advice, log?: DailyLog): DailyReview {
  if (!advice && !log) {
    return { insights: ['当天暂无建议和打卡记录'] };
  }

  const insights: string[] = [];

  if (!advice) {
    insights.push('当天暂无建议');
  }

  if (!log) {
    insights.push('当天暂无打卡记录');
    return { insights };
  }

  for (const [label, key] of mealFields) {
    if (!log.mealsActual[key].trim()) {
      insights.push(`${label}未记录`);
    }
  }

  const suggestedMinutes = advice?.exercise.minutes;
  const actualMinutes = log.exerciseActual.minutes || 0;
  if (!log.exerciseActual.type.trim() && actualMinutes <= 0) {
    insights.push('运动未记录');
  } else if (suggestedMinutes && actualMinutes < suggestedMinutes) {
    insights.push(`运动比建议少 ${suggestedMinutes - actualMinutes} 分钟`);
  } else if (suggestedMinutes && actualMinutes >= suggestedMinutes) {
    insights.push(`运动完成 ${actualMinutes} / ${suggestedMinutes} 分钟`);
  }

  if (!log.weightKg) {
    insights.push('体重未记录');
  }

  if (log.mood && log.mood <= 2) {
    insights.push('心情偏低，建议降低训练强度或早点休息');
  }

  if (insights.length === 0) {
    insights.push('三餐、运动、体重和心情都已记录');
  }

  return { insights };
}
