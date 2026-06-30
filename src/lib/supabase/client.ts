import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 缺凭证时不要在 import 阶段 throw，避免触发"未配置也能跑"路径的 SSR 失败
  // 调用方在使用前应判断 createBrowserSupabase() 的返回值是否为 null
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
}

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * 浏览器端 Supabase 客户端。匿名模式（未配置 env）返回 null，调用方需兜回 localStorage。
 */
export function createBrowserSupabase() {
  if (cached) return cached;
  if (!url || !anonKey) return null;
  cached = createBrowserClient(url, anonKey);
  return cached;
}
