'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { readLocalDb, migrateLocalToSupabase } from '@/lib/repo/migrate';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MigrationModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const local = open ? readLocalDb() : null;
  const hasProfile = !!local?.profile;
  const adviceCount = Object.keys(local?.advices ?? {}).length;
  const logCount = Object.keys(local?.logs ?? {}).length;
  const hasAny = hasProfile || adviceCount > 0 || logCount > 0;

  const migrate = useCallback(
    async (mode: 'all' | 'profile-only') => {
      if (!user) {
        setMessage('请先登录。');
        return;
      }
      setBusy(true);
      setMessage('');

      const client = createBrowserSupabase();
      const result = await migrateLocalToSupabase(client, user.id, mode);

      if (!result.ok) {
        setMessage(`迁移失败：${result.error.message}`);
        setBusy(false);
        return;
      }

      if (mode === 'all') setMessage('迁移完成 ✓');
      else if (result.summary.profileCopied) setMessage('档案已同步到云端 ✓');
      else setMessage('没有档案需要同步。');
      setBusy(false);

      setTimeout(() => window.location.reload(), 600);
    },
    [user],
  );

  if (!open) return null;
  if (!hasAny) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6">
          <h2 className="text-2xl font-black">本地没有数据</h2>
          <p className="mt-2 text-sm text-[#6b665f]">云端账号准备好了，登录就生效。</p>
          <button onClick={onClose} className="btn btn-primary mt-4" type="button">
            好的
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6">
        <h2 className="text-2xl font-black">要不要把本地数据搬到云端？</h2>
        <p className="mt-2 text-sm text-[#6b665f]">
          登录前这台浏览器上还有数据：<b>{hasProfile ? '档案' : ''}</b>
          {adviceCount > 0 ? <b> · {adviceCount} 条建议</b> : null}
          {logCount > 0 ? <b> · {logCount} 条打卡</b> : null}
          。
        </p>
        <p className="mt-2 text-xs text-[#6b665f]">「全部」会清空本地；「只档案」保留建议和打卡在本地。</p>
        <div className="mt-4 grid gap-2">
          <button onClick={() => void migrate('all')} disabled={busy} className="btn btn-primary" type="button">
            {busy ? '处理中...' : '全部搬到云端'}
          </button>
          <button onClick={() => void migrate('profile-only')} disabled={busy} className="btn bg-[#F7F4ED]" type="button">
            {busy ? '处理中...' : '只搬档案'}
          </button>
          <button onClick={onClose} disabled={busy} className="btn bg-white" type="button">
            暂不（保持本地）
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-[#514c45]">{message}</p> : null}
      </div>
    </div>
  );
}
