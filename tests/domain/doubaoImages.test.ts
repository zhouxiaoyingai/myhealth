import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAdvice, sampleProfile } from '../../src/domain/advice';
import { attachDoubaoImages, buildAdviceImagePrompts } from '../../src/lib/doubaoImages';

const originalArkApiKey = process.env.ARK_API_KEY;

afterEach(() => {
  if (originalArkApiKey === undefined) {
    delete process.env.ARK_API_KEY;
  } else {
    process.env.ARK_API_KEY = originalArkApiKey;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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
  it('returns a structured error code when Doubao returns non-JSON', async () => {
    process.env.ARK_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html>gateway error</html>'),
      }),
    );

    const advice = generateAdvice(sampleProfile, '2026-06-24');
    const withImages = await attachDoubaoImages(advice, sampleProfile);

    expect(withImages.images?.source).toBe('fallback');
    expect(withImages.images?.errorCode).toBe('DOUBAO_NON_JSON');
    expect(withImages.images?.error).toContain('non-JSON');
  });
});
