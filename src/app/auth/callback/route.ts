import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * 魔法链接回调：URL 形如 /auth/callback?code=...&next=/...
 * 用 code 换 session（cookie），再 302 到 next（默认 /）。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`);
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth?error=not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
