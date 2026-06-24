export type Gender = 'female' | 'male' | 'other';
export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';
export type DietPlan =
  | 'balanced'
  | 'mediterranean'
  | 'dash'
  | 'mind'
  | 'low_carb'
  | 'high_protein'
  | 'vegetarian'
  | 'plant_based'
  | 'intermittent_168';

export type Profile = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: Activity;
  dietPlan: DietPlan;
  notes: string;
};

export type Meal = {
  name: string;
  items: string;
  protein: number;
  calories: number;
};

export type Exercise = {
  type: string;
  minutes: number;
  intensity: string;
  note: string;
};

export type Metrics = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmi: number;
};

export type Advice = {
  date: string;
  summary: string;
  meals: Meal[];
  exercise: Exercise;
  source: 'local' | 'fallback';
  warning?: string;
  metrics: Metrics;
  images?: {
    dietUrl?: string;
    exerciseUrl?: string;
    source: 'doubao' | 'fallback';
    error?: string;
  };
};

export type DailyLog = {
  date: string;
  mealsActual: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  };
  exerciseActual: {
    type: string;
    minutes: number;
    intensity: string;
    note: string;
  };
  weightKg?: number;
  mood?: 1 | 2 | 3 | 4 | 5;
  moodNote: string;
  updatedAt: string;
};

export type Settings = {
  theme: 'system' | 'light' | 'dark';
};
