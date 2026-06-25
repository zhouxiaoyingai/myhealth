import { NextResponse } from 'next/server';
import { getSignedImageUrl } from '@/lib/supabase/storage';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseStorageKey } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

/**
 * GET /api/image-storage?key=<storage-path>
 * 校验调用者对 key 的所有权（key 中 userId 段 == 当前 auth user），
 * 返回一个 1h 的 signed URL。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter.' }, { status: 400 });
  }

  const parsed = parseStorageKey(key);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid storage key format.' }, { status: 400 });
  }

  const serverSupabase = createServerSupabase();
  if (!serverSupabase) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 503 });
  }
  const { data: userData } = await serverSupabase.auth.getUser();
  if (!userData?.user || userData.user.id !== parsed.userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase admin not configured.' }, { status: 503 });
  }

  const url = await getSignedImageUrl(admin, key, 3600);
  if (!url) {
    return NextResponse.json({ error: 'Failed to create signed URL.' }, { status: 500 });
  }
  return NextResponse.json({ url });
}
