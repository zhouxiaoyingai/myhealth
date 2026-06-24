'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DailyLog } from '@/domain/types';
import { lastDays } from '@/lib/date';
import { repo } from '@/lib/store';

const days = lastDays(30);

export default function HistoryPage() {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    setLogs(repo.getLogs());
  }, []);

  const streak = useMemo(() => {
    let count = 0;
    for (const date of [...days].reverse()) {
      if (!logs[date]) break;
      count += 1;
    }
    return count;
  }, [logs]);

  const selectedLog = logs[selectedDate];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <section className="card">
        <h1 className="text-4xl font-black">历史记录</h1>
        <p className="mt-2 text-[#6b665f]">最近 30 天饮食 / 运动 / 体重 / 心情标记。</p>
        <div className="mt-6 grid grid-cols-5 gap-2 md:grid-cols-10">
          {days.map((date) => {
            const log = logs[date];
            return (
              <button onClick={() => setSelectedDate(date)} className="min-h-20 rounded-2xl bg-white p-2 text-left text-xs" key={date} type="button">
                <b>{date.slice(5)}</b>
                <p>
                  {log?.mealsActual ? '🍱' : ''}
                  {log?.exerciseActual?.type ? '🏋️' : ''}
                  {log?.weightKg ? '⚖️' : ''}
                  {log?.mood ? '😊' : ''}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">🔥 连续打卡 {streak} 天</h2>
        <p className="mt-2">勋章：{streak >= 100 ? '🏆 100天' : streak >= 30 ? '🥇 30天' : streak >= 7 ? '🥈 7天' : '🌱 新芽'}</p>

        <h3 className="mt-6 text-xl font-black">体重趋势</h3>
        <div className="mt-3 flex h-40 items-end gap-2 rounded-2xl bg-[#F7F4ED] p-4">
          {days.slice(-7).map((date) => (
            <div key={date} className="flex-1 rounded-t-xl bg-[#7FE0B5]" style={{ height: `${Math.max(10, ((logs[date]?.weightKg || 55) - 45) * 4)}px` }} title={String(logs[date]?.weightKg || '')} />
          ))}
        </div>

        <h3 className="mt-6 text-xl font-black">心情趋势</h3>
        <div className="mt-3 flex h-28 items-end gap-2 rounded-2xl bg-[#F7F4ED] p-4">
          {days.slice(-7).map((date) => (
            <div key={date} className="flex-1 rounded-t-xl bg-[#C5B0F4]" style={{ height: `${(logs[date]?.mood || 1) * 18}px` }} />
          ))}
        </div>

        {selectedLog ? (
          <div className="mt-6 rounded-2xl bg-[#FCE96A]/50 p-4">
            <b>{selectedDate} 复盘</b>
            <p>饮食：{Object.values(selectedLog.mealsActual).filter(Boolean).join(' / ') || '未记录'}</p>
            <p>
              运动：{selectedLog.exerciseActual.type || '未记录'} {selectedLog.exerciseActual.minutes || ''} 分钟
            </p>
            <p>
              心情：{selectedLog.mood} / 5 · {selectedLog.moodNote}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
