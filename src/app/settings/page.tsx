'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/domain/types';
import { useRepository } from '@/lib/repo';
import { useAuth } from '@/lib/supabase/AuthProvider';

export default function SettingsPage() {
  const repo = useRepository();
  const { status, user, configured } = useAuth();
  const [settings, setSettings] = useState<Settings>({ theme: 'system' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const stored = await repo.getSettings();
      setSettings(stored);
    })();
  }, [repo]);

  async function saveTheme(theme: Settings['theme']) {
    const next = { theme };
    setSettings(next);
    await repo.saveSettings(next);
  }

  async function exportData() {
    setBusy(true);
    setMessage('');
    try {
      const json = await repo.exportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `myhealth-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage('已导出。');
    } catch (e) {
      setMessage(`导出失败：${e instanceof Error ? e.message : '未知原因'}`);
    } finally {
      setBusy(false);
    }
  }

  async function clearData() {
    if (!window.confirm('确认清除？此操作不可撤销（云端只清本人数据）。')) return;
    setBusy(true);
    try {
      await repo.clear();
      setMessage('已清空。');
    } catch (e) {
      setMessage(`清除失败：${e instanceof Error ? e.message : '未知原因'}`);
    } finally {
      setBusy(false);
    }
  }

  const modeLabel = status === 'authenticated' ? '云端（Supabase）' : repo.mode === 'supabase' ? '云端' : '本地';
  const userEmail = user?.email;

  return (
    <section className="card">
      <h1 className="text-4xl font-black">设置</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-[#F7F4ED] p-5">
          <h2 className="text-2xl font-black">主题</h2>
          <select className="input mt-3" value={settings.theme} onChange={(event) => void saveTheme(event.target.value as Settings['theme'])}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        <div className="rounded-3xl bg-[#B8E1FF]/45 p-5">
          <h2 className="text-2xl font-black">账号</h2>
          {configured ? (
            userEmail ? (
              <p className="mt-2 text-sm">
                已登录：<b>{userEmail}</b>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#6b665f]">未登录（数据存在本地）。前往 <a className="underline" href="/auth">/auth</a> 登录。</p>
            )
          ) : (
            <p className="mt-2 text-sm text-[#6b665f]">Supabase 未配置（缺少环境变量）。</p>
          )}
        </div>

        <div className="rounded-3xl bg-[#C5B0F4]/45 p-5 md:col-span-2">
          <h2 className="text-2xl font-black">数据</h2>
          <p className="mt-2 text-sm text-[#514c45]">当前模式：<b>{modeLabel}</b></p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={() => void exportData()} className="btn bg-white" type="button" disabled={busy}>
              导出 JSON
            </button>
            <button onClick={() => void clearData()} className="btn bg-[#FF8A5C] text-white" type="button" disabled={busy}>
              清除我的数据
            </button>
          </div>
          {message ? <p className="mt-3 text-sm font-bold text-[#514c45]">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
