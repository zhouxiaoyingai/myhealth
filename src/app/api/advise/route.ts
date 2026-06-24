import { NextResponse } from 'next/server';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import type { Profile } from '@/domain/types';
import { attachDoubaoImages } from '@/lib/doubaoImages';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profile = (body.profile || sampleProfile) as Profile;
  const advice = generateAdvice(profile, body.date);

  if (body.includeImages === false) {
    return NextResponse.json(advice);
  }

  return NextResponse.json(await attachDoubaoImages(advice, profile));
}
