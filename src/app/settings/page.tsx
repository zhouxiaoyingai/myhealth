'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/domain/types';
import { repo } from '@/lib/store';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ theme: 'system' });

  useEffect(() => {
    setSettings(repo.getSettings());
  }, []);

  function exportLocalData() {
    const blob = new Blob([repo.exportJson()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'myhealth-export.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function saveTheme(theme: Settings['theme']) {
    const nextSettings = { theme };
    setSettings(nextSettings);
    repo.saveSettings(nextSettings);
  }

  return (
    <section className="card">
      <h1 className="text-4xl font-black">设置</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-[#F7F4ED] p-5">
          <h2 className="text-2xl font-black">主题</h2>
          <select className="input mt-3" value={settings.theme} onChange={(event) => saveTheme(event.target.value as Settings['theme'])}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        <div className="rounded-3xl bg-[#B8E1FF]/45 p-5">
          <h2 className="text-2xl font-black">本地数据</h2>
          <button onClick={exportLocalData} className="btn mt-3 bg-white" type="button">
            导出 JSON
          </button>
          <button onClick={() => window.confirm('确认清除？') && repo.clear()} className="btn mt-3 bg-[#FF8A5C] text-white" type="button">
            清除本地数据
          </button>
        </div>

        <div className="rounded-3xl bg-[#C5B0F4]/45 p-5 md:col-span-2">
          <h2 className="text-2xl font-black">云同步</h2>
          <p>当前为本地模式。Supabase Auth、profiles、daily_logs 与 Doubao/Seedream 适配器已预留环境变量，拿到密钥后接入。</p>
        </div>
      </div>
    </section>
  );
}
