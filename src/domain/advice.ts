import { compatibilityWarning, metrics } from './health';
import type { Advice, DietPlan, Goal, Profile } from './types';

export const dietNames: Record<DietPlan, string> = {
  balanced: '均衡饮食',
  mediterranean: '地中海',
  dash: 'DASH',
  mind: 'MIND',
  low_carb: '低碳水',
  high_protein: '高蛋白',
  vegetarian: '蛋奶素',
  plant_based: '植物基',
  intermittent_168: '16+8 断食',
};

const goalVerb: Record<Goal, string> = {
  fat_loss: '轻盈减脂',
  muscle_gain: '稳步增肌',
  maintenance: '健康维持',
};

const mealTemplates: Record<DietPlan, string[]> = {
  balanced: ['燕麦/全谷物 + 鸡蛋或豆制品 + 一份水果', '彩虹蔬菜碗 + 优质蛋白 + 主食半拳到一拳', '清爽蔬菜 + 鱼/鸡/豆腐 + 温和碳水'],
  mediterranean: ['希腊酸奶 + 蓝莓 + 坚果', '橄榄油蔬菜沙拉 + 鱼肉 + 全麦面包', '番茄炖豆 + 深色蔬菜 + 少量谷物'],
  dash: ['低脂奶 + 全麦主食 + 香蕉', '低盐鸡胸/豆腐 + 大份蔬菜 + 糙米', '蒸鱼 + 菌菇青菜 + 红薯'],
  mind: ['莓果燕麦 + 坚果', '绿叶菜 + 豆类 + 全谷物', '鱼类/禽肉 + 深色蔬菜'],
  low_carb: ['鸡蛋 + 牛油果/蔬菜', '大份蔬菜 + 鱼/鸡/豆腐', '菌菇青菜 + 优质蛋白'],
  high_protein: ['鸡蛋 + 高蛋白酸奶 + 水果', '鸡胸/牛肉/豆腐 + 米饭 + 蔬菜', '鱼虾/豆制品 + 蔬菜 + 土豆'],
  vegetarian: ['牛奶/豆浆 + 鸡蛋 + 全麦主食', '豆腐/鹰嘴豆 + 蔬菜 + 糙米', '鸡蛋/豆制品 + 菌菇青菜'],
  plant_based: ['豆浆 + 燕麦 + 坚果', '豆腐/豆类 + 蔬菜 + 全谷物', '藜麦 + 鹰嘴豆 + 深色蔬菜'],
  intermittent_168: ['进食窗开始：高蛋白早午餐', '主餐：蔬菜 + 蛋白 + 主食', '进食窗结束前：清淡晚餐'],
};

export function generateAdvice(profile: Profile, date = new Date().toISOString().slice(0, 10)): Advice {
  const todayMetrics = metrics(profile);
  const proteinPerMainMeal = Math.round(todayMetrics.protein / 3);
  const [breakfast, lunch, dinner] = mealTemplates[profile.dietPlan];

  return {
    date,
    summary: `今天按${dietNames[profile.dietPlan]}节奏，目标是${goalVerb[profile.goal]}。`,
    source: 'local',
    warning: compatibilityWarning(profile),
    metrics: todayMetrics,
    meals: [
      { name: '早餐', items: breakfast, protein: proteinPerMainMeal, calories: Math.round(todayMetrics.targetCalories * 0.3) },
      { name: '午餐', items: lunch, protein: proteinPerMainMeal, calories: Math.round(todayMetrics.targetCalories * 0.4) },
      { name: '晚餐', items: dinner, protein: proteinPerMainMeal, calories: Math.round(todayMetrics.targetCalories * 0.3) },
    ],
    exercise: {
      type: profile.goal === 'muscle_gain' ? '力量训练' : '快走 + 拉伸',
      minutes: profile.activity === 'sedentary' ? 25 : 40,
      intensity: '中等，可完整说短句',
      note: '如有不适请停止，并咨询专业人士。',
    },
  };
}

export const sampleProfile: Profile = {
  gender: 'female',
  age: 32,
  heightCm: 165,
  weightKg: 62,
  goal: 'fat_loss',
  activity: 'light',
  dietPlan: 'balanced',
  notes: '',
};
