import { describe, expect, it } from 'vitest';
import { generateAdvice, sampleProfile } from '../../src/domain/advice';
import { bmi, metrics, withinBackfill } from '../../src/domain/health';
import type { DietPlan, Goal } from '../../src/domain/types';

describe('health calculations', () => {
  it('calculates bmi and metrics', () => {
    expect(bmi(62, 165)).toBe(22.8);
    expect(metrics(sampleProfile).targetCalories).toBeGreaterThan(1000);
  });

  it('validates seven-day backfill', () => {
    expect(withinBackfill('2026-06-20', new Date('2026-06-23'))).toBe(true);
    expect(withinBackfill('2026-06-10', new Date('2026-06-23'))).toBe(false);
  });
});

describe('advice generation', () => {
  const diets: DietPlan[] = ['balanced', 'mediterranean', 'dash', 'mind', 'low_carb', 'high_protein', 'vegetarian', 'plant_based', 'intermittent_168'];
  const goals: Goal[] = ['fat_loss', 'muscle_gain', 'maintenance'];

  it('covers all 27 diet and goal combinations', () => {
    for (const dietPlan of diets) {
      for (const goal of goals) {
        const advice = generateAdvice({ ...sampleProfile, dietPlan, goal });
        expect(advice.meals).toHaveLength(3);
        expect(advice.meals.map((meal) => meal.name)).toEqual(['早餐', '午餐', '晚餐']);
        expect(advice.exercise.minutes).toBeGreaterThan(0);
      }
    }
  });
});
