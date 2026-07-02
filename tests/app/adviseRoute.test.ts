import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAdvice, sampleProfile } from '@/domain/advice';

const routeMocks = vi.hoisted(() => {
  const serverClient = {
    auth: {
      getUser: vi.fn(),
    },
  };

  return {
    attachDoubaoImages: vi.fn(),
    uploadImageFromUrl: vi.fn(),
    createServerSupabase: vi.fn(() => serverClient),
    createAdminSupabase: vi.fn(() => ({ storage: {} })),
    serverClient,
  };
});

vi.mock('@/lib/doubaoImages', () => ({
  attachDoubaoImages: routeMocks.attachDoubaoImages,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: routeMocks.createServerSupabase,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabase: routeMocks.createAdminSupabase,
}));

vi.mock('@/lib/supabase/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/storage')>();
  return {
    ...actual,
    uploadImageFromUrl: routeMocks.uploadImageFromUrl,
  };
});

describe('/api/advise image storage fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.serverClient.auth.getUser.mockResolvedValue({
      data: { user: { id: '00000000-0000-0000-0000-000000000000' } },
    });
  });

  it('keeps temporary Doubao URLs and reports storage failure when cloud upload fails', async () => {
    const { POST } = await import('@/app/api/advise/route');
    const generated = {
      ...generateAdvice(sampleProfile, '2026-06-30'),
      images: {
        source: 'doubao' as const,
        dietUrl: 'https://example.com/diet.png',
        exerciseUrl: 'https://example.com/exercise.png',
      },
    };
    routeMocks.attachDoubaoImages.mockResolvedValue(generated);
    routeMocks.uploadImageFromUrl.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/advise', {
        method: 'POST',
        body: JSON.stringify({
          profile: sampleProfile,
          date: '2026-06-30',
          uploadToCloud: true,
        }),
      }),
    );
    const payload = await response.json();

    expect(routeMocks.uploadImageFromUrl).toHaveBeenCalledTimes(2);
    expect(payload.images.source).toBe('doubao');
    expect(payload.images.dietUrl).toBe('https://example.com/diet.png');
    expect(payload.images.exerciseUrl).toBe('https://example.com/exercise.png');
    expect(payload.images.dietKey).toBeUndefined();
    expect(payload.images.exerciseKey).toBeUndefined();
    expect(payload.images.errorCode).toBe('STORAGE_UPLOAD_FAILED');
    expect(payload.images.error).toContain('云端保存失败');
  });
});
