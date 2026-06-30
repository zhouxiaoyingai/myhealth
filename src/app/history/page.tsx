'use client';

import { useEffect, useMemo, useState } from 'react';
import { summarizeDailyReview } from '@/domain/historyReview';
import type { Advice, DailyLog } from '@/domain/types';
import { lastDays } from '@/lib/date';
import { useRepository } from '@/lib/repo';

const days = lastDays(30);

export default function HistoryPage() {
  const repo = useRepository();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [selectedDate, setSelectedDate] = useState(days[days.length - 1] ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [logList, adviceList] = await Promise.all([repo.listLogs(90), repo.listAdvices(90)]);
      setLogs(logList);
      setAdvices(adviceList);
      setLoading(false);
    })();
  }, [repo]);

  const logsByDate = useMemo(() => {
    const map: Record<string, DailyLog> = {};
    for (const log of logs) map[log.date] = log;
    return map;
  }, [logs]);

  const advicesByDate = useMemo(() => {
    const map: Record<string, Advice> = {};
    for (const advice of advices) map[advice.date] = advice;
    return map;
  }, [advices]);

  const streak = useMemo(() => {
    let count = 0;
    for (const date of [...days].reverse()) {
      if (!logsByDate[date]) break;
      count += 1;
    }
    return count;
  }, [logsByDate]);

  const selectedLog = logsByDate[selectedDate];
  const selectedAdvice = advicesByDate[selectedDate];
  const selectedReview = summarizeDailyReview(selectedAdvice, selectedLog);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
      <section className="card">
        <h1 className="text-4xl font-black">历史记录</h1>
        <p className="mt-2 text-[#6b665f]">最近 30 天饮食 / 运动 / 体重 / 心情标记。</p>
        {loading ? <p className="mt-3 text-sm text-[#6b665f]">读取中...</p> : null}
        <div className="mt-6 grid grid-cols-5 gap-2 md:grid-cols-10">
          {days.map((date) => {
            const log = logsByDate[date];
            return (
              <button
                onClick={() => setSelectedDate(date)}
                className={`min-h-20 rounded-2xl p-2 text-left text-xs ${selectedDate === date ? 'bg-[#171717] text-white' : 'bg-white'}`}
                key={date}
                type="button"
              >
                <b>{date.slice(5)}</b>
                <p>
                  {advicesByDate[date] ? '📋' : ''}
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
            <div key={date} className="flex-1 rounded-t-xl bg-[#7FE0B5]" style={{ height: `${Math.max(10, ((logsByDate[date]?.weightKg || 55) - 45) * 4)}px` }} title={String(logsByDate[date]?.weightKg || '')} />
          ))}
        </div>

        <h3 className="mt-6 text-xl font-black">心情趋势</h3>
        <div className="mt-3 flex h-28 items-end gap-2 rounded-2xl bg-[#F7F4ED] p-4">
          {days.slice(-7).map((date) => (
            <div key={date} className="flex-1 rounded-t-xl bg-[#C5B0F4]" style={{ height: `${(logsByDate[date]?.mood || 1) * 18}px` }} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#FCE96A]/50 p-4">
          <b>{selectedDate} 复盘</b>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/70 p-4">
              <h4 className="font-black">当天建议</h4>
              {selectedAdvice ? (
                <>
                  <div className="mt-2 space-y-2 text-sm">
                    {selectedAdvice.meals.map((meal) => (
                      <p key={meal.name}>
                        <b>{meal.name}：</b>
                        {meal.items}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-sm">
                    <b>运动：</b>
                    {selectedAdvice.exercise.type} · {selectedAdvice.exercise.minutes} 分钟
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#6b665f]">未生成当天建议。</p>
              )}
            </div>

            <div className="rounded-2xl bg-white/70 p-4">
              <h4 className="font-black">实际打卡</h4>
              {selectedLog ? (
                <>
                  <p className="mt-2 text-sm">饮食：{Object.values(selectedLog.mealsActual).filter(Boolean).join(' / ') || '未记录'}</p>
                  <p className="mt-2 text-sm">
                    运动：{selectedLog.exerciseActual.type || '未记录'} {selectedLog.exerciseActual.minutes || ''} 分钟
                  </p>
                  <p className="mt-2 text-sm">体重：{selectedLog.weightKg ? `${selectedLog.weightKg} kg` : '未记录'}</p>
                  <p className="mt-2 text-sm">
                    心情：{selectedLog.mood ? `${selectedLog.mood} / 5` : '未记录'}
                    {selectedLog.moodNote ? ` · ${selectedLog.moodNote}` : ''}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#6b665f]">未记录当天打卡。</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/80 p-4">
            <h4 className="font-black">差异摘要</h4>
            <ul className="mt-2 space-y-1 text-sm">
              {selectedReview.insights.map((insight) => (
                <li key={insight}>- {insight}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
