'use client';

import { useEffect, useState } from 'react';
import { bmi, withinBackfill } from '@/domain/health';
import type { DailyLog } from '@/domain/types';
import { today } from '@/lib/date';
import { useRepository } from '@/lib/repo';

function blankLog(date = today()): DailyLog {
  return {
    date,
    mealsActual: { breakfast: '', lunch: '', dinner: '', snack: '' },
    exerciseActual: { type: '', minutes: 0, intensity: '轻松', note: '' },
    mood: 4,
    moodNote: '',
    updatedAt: new Date().toISOString(),
  };
}

export default function LogPage() {
  const repo = useRepository();
  const [log, setLog] = useState<DailyLog>(blankLog());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await repo.getLog(today());
      setLog(stored ?? blankLog());
    })();
  }, [repo]);

  async function onDateChange(date: string) {
    setLoading(true);
    const stored = await repo.getLog(date);
    setLog(stored ?? blankLog(date));
    setLoading(false);
  }

  async function save() {
    if (!withinBackfill(log.date)) {
      setMessage('只能补录最近 7 天。');
      return;
    }

    await repo.upsertLog({ ...log, updatedAt: new Date().toISOString() });
    setMessage('已保存打卡。');
  }

  return (
    <section className="card">
      <h1 className="text-4xl font-black">每日打卡</h1>
      <label className="label mt-4 block">
        日期
        <input
          type="date"
          className="input mt-1"
          value={log.date}
          onChange={(event) => void onDateChange(event.target.value)}
        />
      </label>
      {loading ? <p className="mt-2 text-sm text-[#6b665f]">读取中...</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-[#FFD6E0]/60 p-5">
          <h2 className="text-2xl font-black">🍱 饮食</h2>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealKey) => (
            <input
              key={mealKey}
              className="input mt-3"
              placeholder={mealKey}
              value={log.mealsActual[mealKey]}
              onChange={(event) => setLog({ ...log, mealsActual: { ...log.mealsActual, [mealKey]: event.target.value } })}
            />
          ))}
        </div>

        <div className="rounded-3xl bg-[#B8E1FF]/60 p-5">
          <h2 className="text-2xl font-black">🏋️ 运动</h2>
          <input className="input mt-3" placeholder="类型" value={log.exerciseActual.type} onChange={(event) => setLog({ ...log, exerciseActual: { ...log.exerciseActual, type: event.target.value } })} />
          <input className="input mt-3" type="number" placeholder="分钟" value={log.exerciseActual.minutes} onChange={(event) => setLog({ ...log, exerciseActual: { ...log.exerciseActual, minutes: Number(event.target.value) } })} />
          <select className="input mt-3" value={log.exerciseActual.intensity} onChange={(event) => setLog({ ...log, exerciseActual: { ...log.exerciseActual, intensity: event.target.value } })}>
            <option value="轻松">轻松</option>
            <option value="中等">中等</option>
            <option value="较高">较高</option>
          </select>
          <input className="input mt-3" placeholder="备注" value={log.exerciseActual.note} onChange={(event) => setLog({ ...log, exerciseActual: { ...log.exerciseActual, note: event.target.value } })} />
        </div>

        <div className="rounded-3xl bg-[#7FE0B5]/45 p-5">
          <h2 className="text-2xl font-black">⚖️ 体重</h2>
          <input className="input mt-3" type="number" step="0.1" value={log.weightKg || ''} onChange={(event) => setLog({ ...log, weightKg: Number(event.target.value) || undefined })} />
          <p className="mt-2 font-bold">BMI：{log.weightKg ? bmi(log.weightKg, 165) : '填写体重后显示'}</p>
        </div>

        <div className="rounded-3xl bg-[#C5B0F4]/45 p-5">
          <h2 className="text-2xl font-black">😊 心情</h2>
          <select className="input mt-3" value={log.mood} onChange={(event) => setLog({ ...log, mood: Number(event.target.value) as DailyLog['mood'] })}>
            {['😣', '😐', '🙂', '😊', '🤩'].map((mood, index) => (
              <option key={mood} value={index + 1}>
                {mood}
              </option>
            ))}
          </select>
          <textarea maxLength={140} className="input mt-3" value={log.moodNote} onChange={(event) => setLog({ ...log, moodNote: event.target.value })} />
        </div>
      </div>

      <button onClick={() => void save()} className="btn btn-primary mt-6" type="button">
        保存今日打卡
      </button>
      {message ? <p className="mt-3 font-bold text-[#514c45]">{message}</p> : null}
    </section>
  );
}
