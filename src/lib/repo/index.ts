'use client';

import { useMemo } from 'react';
import { LocalRepository } from './local';
import { SupabaseRepository } from './supabase';
import type { Repository } from './types';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { createBrowserSupabase } from '@/lib/supabase/client';

/**
 * 当前用户的 Repository：登录 → Supabase；匿名 → localStorage。
 * 任何对 repo 的访问都应在 'use client' 组件中，hook 会自动响应登录状态变化。
 */
export function useRepository(): Repository {
  const { status, user } = useAuth();

  return useMemo<Repository>(() => {
    if (status === 'authenticated' && user) {
      const client = createBrowserSupabase();
      if (client) {
        return new SupabaseRepository(client, user.id);
      }
    }
    return new LocalRepository();
  }, [status, user]);
}

export type { Repository } from './types';
