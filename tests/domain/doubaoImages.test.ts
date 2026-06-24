import { describe, expect, it } from 'vitest';
import { generateAdvice, sampleProfile } from '../../src/domain/advice';
import { buildAdviceImagePrompts } from '../../src/lib/doubaoImages';

describe('doubao image prompts', () => {
  it('builds separate diet and exercise prompts from advice', () => {
    const advice = generateAdvice(sampleProfile, '2026-06-24');
    const prompts = buildAdviceImagePrompts(advice, sampleProfile);

    expect(prompts.diet).toContain('横向三联画');
    expect(prompts.diet).toContain('早餐、午餐、晚餐');
    expect(prompts.diet).toContain('均衡饮食');
    expect(prompts.diet).toContain('早餐');
    expect(prompts.exercise).toContain('动态插画风健康运动卡片主视觉');
    expect(prompts.exercise).toContain('横向 16:9');
    expect(prompts.exercise).toContain('完整人物全身入镜');
    expect(prompts.exercise).toContain('不要裁切头部、手臂、腿脚');
    expect(prompts.exercise).toContain(advice.exercise.type);
  });
});
