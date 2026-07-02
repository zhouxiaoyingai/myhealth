'use client';

import { useEffect, useMemo, useState } from 'react';
import { Illustration } from '@/components/Illustration';
import { summarizeDailyReview } from '@/domain/historyReview';
import type { Advice, DailyLog } from '@/domain/types';
import { lastDays } from '@/lib/date';
import { useRepository } from '@/lib/repo';
import { useImageUrl } from '@/lib/useImageUrl';

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

  const recordedDays = useMemo(() => days.filter((date) => logsByDate[date]).length, [logsByDate]);

  const selectedLog = logsByDate[selectedDate];
  const selectedAdvice = advicesByDate[selectedDate];
  const selectedReview = summarizeDailyReview(selectedAdvice, selectedLog, { recentLogs: logs, selectedDate });
  const selectedDietImage = useImageUrl(selectedAdvice?.images?.dietKey ?? selectedAdvice?.images?.dietUrl);
  const selectedExerciseImage = useImageUrl(selectedAdvice?.images?.exerciseKey ?? selectedAdvice?.images?.exerciseUrl);
  const selectedImagesFallbackMessage =
    selectedDietImage.error || selectedExerciseImage.error || selectedAdvice?.images?.source === 'fallback'
      ? '图片暂不可用'
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:items-start">
      <section className="card self-start">
        <h1 className="text-4xl font-black">历史记录</h1>
        <p className="mt-2 text-[#6b665f]">最近 30 天饮食 / 运动 / 体重 / 心情标记。</p>
        {loading ? <p className="mt-3 text-sm text-[#6b665f]">读取中...</p> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatPill label="连续打卡" value={`${streak} 天`} />
          <StatPill label="有效记录" value={`${recordedDays} 天`} />
          <StatPill label="当前选中" value={selectedDate.slice(5).replace('-', '/')} />
        </div>

        <div className="mt-6 grid grid-cols-5 gap-2 md:grid-cols-10">
          {days.map((date) => {
            const log = logsByDate[date];
            const isActive = selectedDate === date;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-pressed={isActive}
                className={`min-h-20 rounded-2xl p-2 text-left text-xs transition ${
                  isActive ? 'bg-[#171717] text-white shadow-lg' : 'bg-white hover:bg-[#f7f4ed]'
                }`}
              >
                <b className="block whitespace-nowrap text-[11px] leading-none">{date.slice(5).replace('-', '/')}</b>
                <p className="mt-2 text-[11px] leading-tight">
                  {advicesByDate[date] ? '🍱' : ''}
                  {log?.mealsActual ? '📋' : ''}
                  {log?.exerciseActual?.type ? '🏋️' : ''}
                  {log?.weightKg ? '⚖️' : ''}
                  {log?.mood ? '😊' : ''}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-[#6b665f]">点击任意日期查看当天建议、实际打卡和复盘结论。</p>
      </section>

      <section className="card self-start">
        <h2 className="text-2xl font-black">🔥 连续打卡 {streak} 天</h2>
        <p className="mt-2 text-[#6b665f]">
          勋章：
          {' '}
          {streak >= 100 ? '🏆 100天' : streak >= 30 ? '🥇 30天' : streak >= 7 ? '🥈 7天' : '🥚 新芽'}
        </p>

        <h3 className="mt-6 text-xl font-black">体重趋势</h3>
        <div className="mt-3 flex h-36 items-end gap-2 rounded-2xl bg-[#F7F4ED] p-4">
          {days.slice(-7).map((date) => (
            <div
              key={date}
              className="flex-1 rounded-t-xl bg-[#7FE0B5]"
              style={{ height: `${Math.max(10, ((logsByDate[date]?.weightKg || 55) - 45) * 4)}px` }}
              title={String(logsByDate[date]?.weightKg || '')}
            />
          ))}
        </div>

        <h3 className="mt-6 text-xl font-black">心情趋势</h3>
        <div className="mt-3 flex h-28 items-end gap-2 rounded-2xl bg-[#F7F4ED] p-4">
          {days.slice(-7).map((date) => (
            <div
              key={date}
              className="flex-1 rounded-t-xl bg-[#C5B0F4]"
              style={{ height: `${(logsByDate[date]?.mood || 1) * 18}px` }}
            />
          ))}
        </div>
      </section>

      <section className="card lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <b className="text-xl font-black">{selectedDate} 复盘</b>
          <span className="rounded-full bg-[#fff4bf] px-3 py-1 text-sm font-bold text-[#705d00]">
            {selectedReview.insights.length} 条洞察
          </span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#eee4d8] bg-[#FCE96A]/40 p-3">
            <h4 className="text-base font-black">当天建议</h4>
            {selectedAdvice ? (
              <>
                {selectedAdvice.images ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Illustration
                      type="food"
                      imageUrl={selectedDietImage.url}
                      alt="当天饮食图"
                      variant="compact"
                      proxied={selectedAdvice.images.source === 'doubao'}
                      loading={selectedDietImage.loading}
                      fallbackMessage={selectedImagesFallbackMessage}
                    />
                    <Illustration
                      type="sport"
                      imageUrl={selectedExerciseImage.url}
                      alt="当天运动图"
                      variant="compact"
                      proxied={selectedAdvice.images.source === 'doubao'}
                      loading={selectedExerciseImage.loading}
                      fallbackMessage={selectedImagesFallbackMessage}
                    />
                  </div>
                ) : null}

                <div className="mt-3 space-y-1.5 text-sm">
                  {selectedAdvice.meals.map((meal) => (
                    <p key={meal.name}>
                      <b>{meal.name}：</b>
                      {meal.items}
                    </p>
                  ))}
                </div>

                <p className="mt-3 text-sm leading-relaxed">
                  <b>运动：</b>
                  {selectedAdvice.exercise.type} · {selectedAdvice.exercise.minutes} 分钟
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#6b665f]">未生成当天建议。</p>
            )}
          </div>

          <div className="rounded-3xl border border-[#eee4d8] bg-white/75 p-3">
            <h4 className="text-base font-black">实际打卡</h4>
            {selectedLog ? (
              <>
                <p className="mt-2 text-sm leading-relaxed">饮食：{Object.values(selectedLog.mealsActual).filter(Boolean).join(' / ') || '未记录'}</p>
                <p className="mt-2 text-sm leading-relaxed">
                  运动：
                  {selectedLog.exerciseActual.type || '未记录'}
                  {' '}
                  {selectedLog.exerciseActual.minutes || ''}
                  {' '}
                  分钟
                </p>
                <p className="mt-2 text-sm">体重：{selectedLog.weightKg ? `${selectedLog.weightKg} kg` : '未记录'}</p>
                <p className="mt-2 text-sm leading-relaxed">
                  心情：
                  {selectedLog.mood ? `${selectedLog.mood} / 5` : '未记录'}
                  {selectedLog.moodNote ? ` · ${selectedLog.moodNote}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#6b665f]">当天还没有打卡。</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-[#eee4d8] bg-white/80 p-3">
          <h4 className="text-base font-black">差异摘要</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {selectedReview.insights.map((insight) => (
              <li key={insight}>- {insight}</li>
            ))}
          </ul>
          {selectedReview.recommendation ? (
            <p className="mt-3 rounded-2xl bg-[#7FE0B5]/25 p-3 text-sm font-bold text-[#355548]">
              复盘建议：{selectedReview.recommendation}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F4ED] px-4 py-3">
      <p className="text-xs font-bold text-[#6b665f]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
