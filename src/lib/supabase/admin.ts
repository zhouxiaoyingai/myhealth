import { createClient } from '@supabase/supabase-js';

/**
 * 服务端 Admin client，service role，绝不能 import 到 client component。
 * 用于：AI 图片 → Storage 上传、admin 维护脚本等。
 */
export function createAdminSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('[supabase admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
