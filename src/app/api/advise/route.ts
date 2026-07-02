import { NextResponse } from 'next/server';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import type { Profile } from '@/domain/types';
import { attachDoubaoImages } from '@/lib/doubaoImages';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { uploadImageFromUrl, type ImageSlot } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

type AdviseRequest = {
  profile?: Profile;
  date?: string;
  includeImages?: boolean;
  // 登录用户标识：命中且 Supabase 已配置 → 上传 Storage
  uploadToCloud?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AdviseRequest;
  const profile = (body.profile || sampleProfile) as Profile;
  const advice = generateAdvice(profile, body.date);

  if (body.includeImages === false) {
    return NextResponse.json(advice);
  }

  const withImages = await attachDoubaoImages(advice, profile);

  // 登录用户：把豆包图代理 → 上传 Supabase Storage，附上 storage key
  if (body.uploadToCloud) {
    const serverSupabase = createServerSupabase();
    const adminSupabase = createAdminSupabase();
    if (serverSupabase && adminSupabase) {
      const { data: userData } = await serverSupabase.auth.getUser();
      const user = userData?.user;
      const date = advice.date;
      if (user) {
        const dietKey = withImages.images?.dietUrl
          ? await uploadImageFromUrl(adminSupabase, { sourceUrl: withImages.images.dietUrl, userId: user.id, date, slot: 'diet' })
          : null;
        const exerciseKey = withImages.images?.exerciseUrl
          ? await uploadImageFromUrl(adminSupabase, { sourceUrl: withImages.images.exerciseUrl, userId: user.id, date, slot: 'exercise' })
          : null;

        if (dietKey || exerciseKey) {
          const mergedImages = {
            ...(withImages.images ?? { source: 'fallback' as const }),
            dietKey: dietKey ?? undefined,
            exerciseKey: exerciseKey ?? undefined,
          };
          return NextResponse.json({ ...withImages, images: mergedImages });
        }

        if (withImages.images?.source === 'doubao') {
          console.error('[advise:image:storage] all uploads failed; returning temporary Doubao URLs');
          return NextResponse.json({
            ...withImages,
            images: {
              ...withImages.images,
              errorCode: 'STORAGE_UPLOAD_FAILED' as const,
              error: '图片已生成但云端保存失败，已临时展示。',
            },
          });
        }
      }
    }
  }

  return NextResponse.json(withImages);
}

// re-export for type discipline
export type { ImageSlot };
