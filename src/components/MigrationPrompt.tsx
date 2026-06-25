'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { MigrationModal } from '@/components/MigrationModal';

const LOCAL_KEY = 'myhealth.local.v1';
const PROMPT_FLAG = 'myhealth.migrationPrompted.v1';

function hasLocalData(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { profile?: unknown; advices?: Record<string, unknown>; logs?: Record<string, unknown> };
    return !!parsed.profile || Object.keys(parsed.advices ?? {}).length > 0 || Object.keys(parsed.logs ?? {}).length > 0;
  } catch {
    return false;
  }
}

/**
 * 监听 AuthProvider 状态：登录成功后，如果本地有数据，弹一次迁移询问。
 * 关闭后写标记位；切换账号会重置标记。
 */
export function MigrationPrompt() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // 登录态变化时重新评估
  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setOpen(false);
      setDismissed(true);
      return;
    }
    // 该用户是否已经问过
    const askedUsers = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(PROMPT_FLAG) ?? '{}') as Record<string, true>;
      } catch {
        return {};
      }
    })();
    if (askedUsers[user.id]) {
      setDismissed(true);
      setOpen(false);
      return;
    }
    setDismissed(false);
    if (hasLocalData()) {
      setOpen(true);
    } else {
      // 标记为已问
      const next = { ...askedUsers, [user.id]: true };
      window.localStorage.setItem(PROMPT_FLAG, JSON.stringify(next));
    }
  }, [status, user]);

  function handleClose() {
    if (user) {
      const asked = (() => {
        try {
          return JSON.parse(window.localStorage.getItem(PROMPT_FLAG) ?? '{}') as Record<string, true>;
        } catch {
          return {};
        }
      })();
      const next = { ...asked, [user.id]: true };
      window.localStorage.setItem(PROMPT_FLAG, JSON.stringify(next));
    }
    setOpen(false);
    setDismissed(true);
  }

  if (dismissed) return null;
  return <MigrationModal open={open} onClose={handleClose} />;
}
