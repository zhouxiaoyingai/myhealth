import { dietNames } from '../domain/advice';
import type { Advice, Profile } from '../domain/types';

type DoubaoImageResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

type AdviceImagePrompts = {
  diet: string;
  exercise: string;
};

const defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
const defaultModel = 'doubao-seedream-5-0-260128';

function getApiKey() {
  return process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || process.env.SEEDREAM_API_KEY;
}

function getBaseUrl() {
  return (process.env.ARK_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
}

function getModel() {
  return process.env.DOUBAO_IMAGE_MODEL || process.env.SEEDREAM_MODEL || defaultModel;
}

function profileGoal(profile: Profile) {
  if (profile.goal === 'fat_loss') return '减脂';
  if (profile.goal === 'muscle_gain') return '增肌';
  return '健康维持';
}

export function buildAdviceImagePrompts(advice: Advice, profile: Profile): AdviceImagePrompts {
  const breakfast = advice.meals.find((meal) => meal.name === '早餐');
  const lunch = advice.meals.find((meal) => meal.name === '午餐');
  const dinner = advice.meals.find((meal) => meal.name === '晚餐');

  return {
    diet: `一张横向三联画的健康饮食海报，从左到右依次展示「早餐、午餐、晚餐」三道菜，每道菜为一张独立的圆角白色餐盘照片（俯拍 45 度视角），三道菜风格统一、光线一致、餐盘之间留白分隔；底部用细字标注每餐名称和 kcal。

饮食方案：${dietNames[profile.dietPlan]}，用户目标：${profileGoal(profile)}。
早餐：${breakfast ? `${breakfast.items} · 约 ${breakfast.calories} kcal` : ''}
午餐：${lunch ? `${lunch.items} · 约 ${lunch.calories} kcal` : ''}
晚餐：${dinner ? `${dinner.items} · 约 ${dinner.calories} kcal` : ''}

风格：明亮自然光、专业美食摄影、白背景、轻蒸汽、诱人色泽。不要出现品牌标识、人物面部、药品或医疗器械。`,
    exercise: [
      '横向 16:9 动态插画风健康运动卡片主视觉。',
      `运动建议: ${advice.exercise.type}，${advice.exercise.minutes}分钟，强度${advice.exercise.intensity}。`,
      `用户目标: ${profileGoal(profile)}。`,
      '画面表现轻松可持续的日常运动，1-2 个完整人物全身入镜，从头到脚完整可见，人物位于画面中间，不要贴近画面边缘，四周保留充足留白。',
      '明亮配色，干净背景，有活力但不过度竞技，适合移动端健康应用卡片。',
      '不要裁切头部、手臂、腿脚，不要出现文字、水印、品牌标识、危险动作、医疗场景或夸张肌肉展示。',
    ].join(' '),
  };
}

async function generateDoubaoImage(prompt: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing ARK_API_KEY, DOUBAO_API_KEY, or SEEDREAM_API_KEY.');
  }

  const response = await fetch(`${getBaseUrl()}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      prompt,
      size: process.env.DOUBAO_IMAGE_SIZE || '2K',
      output_format: 'png',
      response_format: 'url',
      watermark: false,
    }),
  });

  const text = await response.text();
  let payload: DoubaoImageResponse;

  try {
    payload = JSON.parse(text) as DoubaoImageResponse;
  } catch {
    throw new Error(`Doubao image API returned non-JSON response: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || `Doubao image API failed with ${response.status}.`);
  }

  const firstImage = payload.data?.[0];
  if (firstImage?.url) return firstImage.url;
  if (firstImage?.b64_json) return `data:image/png;base64,${firstImage.b64_json}`;

  throw new Error('Doubao image API returned no image URL.');
}

export async function attachDoubaoImages(advice: Advice, profile: Profile): Promise<Advice> {
  try {
    const prompts = buildAdviceImagePrompts(advice, profile);
    const [dietUrl, exerciseUrl] = await Promise.all([
      generateDoubaoImage(prompts.diet),
      generateDoubaoImage(prompts.exercise),
    ]);

    return {
      ...advice,
      images: {
        dietUrl,
        exerciseUrl,
        source: 'doubao',
      },
    };
  } catch (error) {
    return {
      ...advice,
      images: {
        ...advice.images,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Doubao image generation failed.',
      },
    };
  }
}
