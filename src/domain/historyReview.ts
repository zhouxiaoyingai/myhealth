import type { Advice, DailyLog } from './types';

const mealFields = [
  ['早餐', 'breakfast'],
  ['午餐', 'lunch'],
  ['晚餐', 'dinner'],
] as const;

export type DailyReviewContext = {
  recentLogs?: DailyLog[];
  selectedDate?: string;
};

export type DailyReview = {
  insights: string[];
  recommendation?: string;
};

export function summarizeDailyReview(advice?: Advice, log?: DailyLog, context: DailyReviewContext = {}): DailyReview {
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

  const missingMeals = collectMissingMeals(log);
  for (const meal of missingMeals) {
    insights.push(`${meal}未记录`);
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

  if (suggestedMinutes && actualMinutes > 0) {
    insights.push(`运动完成率 ${Math.round((actualMinutes / suggestedMinutes) * 100)}%`);
  }

  if (!log.weightKg) {
    insights.push('体重未记录');
  }

  if (log.mood && log.mood <= 2) {
    insights.push('心情偏低，建议降低训练强度或早点休息');
  }

  const recentLogs = getLogsThroughSelectedDate(context.recentLogs ?? [], log, context.selectedDate ?? log.date);
  appendMoodInsight(insights, recentLogs);
  appendWeightTrendInsight(insights, recentLogs);
  appendDietCompletenessInsight(insights, recentLogs);

  if (insights.length === 0) {
    insights.push('三餐、运动、体重和心情都已记录');
  }

  return {
    insights,
    recommendation: buildRecommendation(advice, log, missingMeals),
  };
}

function collectMissingMeals(log: DailyLog): string[] {
  return mealFields.flatMap(([label, key]) => (log.mealsActual[key].trim() ? [] : [label]));
}

function getLogsThroughSelectedDate(recentLogs: DailyLog[], selectedLog: DailyLog, selectedDate: string): DailyLog[] {
  const byDate = new Map<string, DailyLog>();
  for (const item of recentLogs) {
    if (item.date <= selectedDate) byDate.set(item.date, item);
  }
  byDate.set(selectedLog.date, selectedLog);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
}

function appendMoodInsight(insights: string[], recentLogs: DailyLog[]) {
  const latestMoodLogs = [...recentLogs]
    .filter((item) => item.mood !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  if (latestMoodLogs.length === 3 && latestMoodLogs.every((item) => item.mood && item.mood <= 2)) {
    insights.push('最近 3 次心情偏低，建议降低训练压力');
  }
}

function appendWeightTrendInsight(insights: string[], recentLogs: DailyLog[]) {
  const weightLogs = recentLogs.filter((item) => item.weightKg !== undefined);
  if (weightLogs.length < 2) return;

  const first = weightLogs[0].weightKg;
  const last = weightLogs[weightLogs.length - 1].weightKg;
  if (first === undefined || last === undefined) return;

  const diff = Number((last - first).toFixed(1));
  if (Math.abs(diff) < 0.1) return;

  if (diff < 0) {
    insights.push(`最近 7 天体重下降 ${Math.abs(diff).toFixed(1)}kg，节奏正常`);
  } else {
    insights.push(`最近 7 天体重上升 ${diff.toFixed(1)}kg，留意饮食和恢复`);
  }
}

function appendDietCompletenessInsight(insights: string[], recentLogs: DailyLog[]) {
  if (recentLogs.length === 0) return;

  const recordedMeals = recentLogs.reduce((count, item) => {
    return count + mealFields.filter(([, key]) => item.mealsActual[key].trim()).length;
  }, 0);
  const totalMeals = recentLogs.length * mealFields.length;
  if (totalMeals === 0) return;

  insights.push(`本周三餐记录完整率 ${Math.round((recordedMeals / totalMeals) * 100)}%`);
}

function buildRecommendation(advice: Advice | undefined, log: DailyLog, missingMeals: string[]): string | undefined {
  if (!advice) return undefined;
  if (missingMeals.length > 0) {
    return `明天优先补齐${missingMeals[0]}记录，运动保持 ${advice.exercise.minutes} 分钟${advice.exercise.type}即可。`;
  }

  if (!log.exerciseActual.type.trim() || log.exerciseActual.minutes < advice.exercise.minutes) {
    return `明天运动保持 ${advice.exercise.minutes} 分钟${advice.exercise.type}即可，先把节奏稳定下来。`;
  }

  return '明天延续今天的记录节奏，饮食和运动都保持当前强度。';
}
