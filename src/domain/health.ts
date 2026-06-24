import type { Activity, Metrics, Profile } from './types';

const activityFactor: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export function bmi(weightKg: number, heightCm: number) {
  return Number((weightKg / (heightCm / 100) ** 2).toFixed(1));
}

export function bmr(profile: Profile) {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  const genderOffset = profile.gender === 'male' ? 5 : profile.gender === 'female' ? -161 : -78;
  return Math.round(base + genderOffset);
}

export function metrics(profile: Profile): Metrics {
  const base = bmr(profile);
  const tdee = Math.round(base * activityFactor[profile.activity]);
  const targetCalories = Math.round(
    tdee + (profile.goal === 'fat_loss' ? -400 : profile.goal === 'muscle_gain' ? 250 : 0),
  );
  const protein = Math.round(profile.weightKg * (profile.goal === 'muscle_gain' ? 1.8 : 1.4));
  const fat = Math.round((targetCalories * 0.28) / 9);
  const carbs = Math.max(0, Math.round((targetCalories - protein * 4 - fat * 9) / 4));

  return {
    bmr: base,
    tdee,
    targetCalories,
    protein,
    carbs,
    fat,
    bmi: bmi(profile.weightKg, profile.heightCm),
  };
}

export function compatibilityWarning(profile: Profile) {
  if (profile.dietPlan === 'intermittent_168' && profile.goal === 'muscle_gain') {
    return '16+8 断食与增肌不完全匹配，请优先保证训练后蛋白和总热量。';
  }

  if ((profile.dietPlan === 'low_carb' || profile.dietPlan === 'plant_based') && profile.goal === 'muscle_gain') {
    return '当前方案增肌时需要额外关注蛋白质与训练恢复。';
  }

  return undefined;
}

export function withinBackfill(date: string, today = new Date()) {
  const logDate = new Date(`${date}T00:00:00`);
  const currentDate = new Date(`${today.toISOString().slice(0, 10)}T00:00:00`);
  const dayDiff = (+currentDate - +logDate) / 86_400_000;

  return dayDiff >= 0 && dayDiff <= 7;
}
