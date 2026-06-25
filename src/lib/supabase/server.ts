import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createServerSupabase() {
  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();
      },
      async setAll(items: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          const store = await cookieStore;
          items.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {
          // 在 Server Component 里 setAll 会失败（cookie 只能在 Server Action / Route Handler 写）
          // 这种情况由 middleware 兜住；这里静默吞掉
        }
      },
    },
  });
}
