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
    /** 饮食图显示用 URL（豆包原图 → /api/image-proxy 代理）。短时效。 */
    dietUrl?: string;
    /** 运动图显示用 URL。 */
    exerciseUrl?: string;
    /** 登录用户：豆包图被同步上传到 Supabase Storage 后的 storage key（持久）。 */
    dietKey?: string;
    exerciseKey?: string;
    source: 'doubao' | 'fallback';
    errorCode?:
      | 'DOUBAO_API_KEY_MISSING'
      | 'DOUBAO_TIMEOUT'
      | 'DOUBAO_NON_JSON'
      | 'DOUBAO_API_FAILED'
      | 'DOUBAO_NO_IMAGE_URL'
      | 'DOUBAO_REQUEST_FAILED'
      | 'IMAGE_FETCH_FAILED'
      | 'STORAGE_UPLOAD_FAILED'
      | 'SIGNED_URL_FAILED';
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
