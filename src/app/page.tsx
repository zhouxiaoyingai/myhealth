'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import html2canvas from 'html2canvas';
import { Illustration } from '@/components/Illustration';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import type { Advice, DailyLog, Profile } from '@/domain/types';
import { today } from '@/lib/date';
import { useRepository } from '@/lib/repo';
import { useImageUrl } from '@/lib/useImageUrl';

export default function Home() {
  const repo = useRepository();
  const [profile, setProfile] = useState<Profile>();
  const [advice, setAdvice] = useState<Advice>();
  const [log, setLog] = useState<DailyLog>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageError, setImageError] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const regenerate = useCallback(
    async (activeProfile: Profile) => {
      setIsGenerating(true);
      setImageError(undefined);

      try {
        const response = await fetch('/api/advise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: activeProfile,
            date: today(),
            uploadToCloud: repo.mode === 'supabase',
          }),
        });

        if (!response.ok) {
          throw new Error(`Advice API failed with ${response.status}`);
        }

        const regeneratedAdvice = (await response.json()) as Advice;
        if (regeneratedAdvice.images?.source === 'fallback' && regeneratedAdvice.images?.error) {
          setImageError(regeneratedAdvice.images.error);
        }
        await repo.saveAdvice(regeneratedAdvice);
        setAdvice(regeneratedAdvice);
      } catch (error) {
        const fallbackAdvice = generateAdvice(activeProfile, today());
        setImageError(error instanceof Error ? error.message : '未知错误');
        await repo.saveAdvice(fallbackAdvice);
        setAdvice(fallbackAdvice);
      } finally {
        setIsGenerating(false);
      }
    },
    [repo],
  );

  useEffect(() => {
    void (async () => {
      const date = today();
      const stored = await repo.getProfile();
      const activeProfile = stored ?? sampleProfile;
      const storedAdvice = await repo.getAdvice(date);
      const cachedAdvice = storedAdvice ?? generateAdvice(activeProfile, date);
      const storedLog = await repo.getLog(date);

      await repo.saveAdvice(cachedAdvice);
      setProfile(activeProfile);
      setAdvice(cachedAdvice);
      setLog(storedLog ?? undefined);
      if (cachedAdvice.images?.source === 'fallback' && cachedAdvice.images?.error) {
        setImageError(cachedAdvice.images.error);
      }

      if (cachedAdvice.images?.source !== 'doubao') {
        void regenerate(activeProfile);
      }
    })();
  }, [regenerate, repo]);

  async function saveCard() {
    if (!cardRef.current) return;
    setIsExporting(true);
    setExportMessage('正在生成图片...');

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#FFFEFA',
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        logging: false,
      });

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas toBlob 返回空。');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `myhealth-${advice?.date || today()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setExportMessage('已保存到下载文件夹 ✓');
    } catch (error) {
      setExportMessage(
        `导出失败：${error instanceof Error ? error.message : '未知原因'}。可以试试截图保存。`,
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!advice || !profile) return null;

  return (
    <HomeBody
      advice={advice}
      log={log}
      cardRef={cardRef}
      isGenerating={isGenerating}
      isExporting={isExporting}
      imageError={imageError}
      exportMessage={exportMessage}
      onRegenerate={() => void regenerate(profile)}
      onSave={() => void saveCard()}
    />
  );
}

function HomeBody({
  advice,
  log,
  cardRef,
  isGenerating,
  isExporting,
  imageError,
  exportMessage,
  onRegenerate,
  onSave,
}: {
  advice: Advice;
  log?: DailyLog;
  cardRef: RefObject<HTMLDivElement | null>;
  isGenerating: boolean;
  isExporting: boolean;
  imageError?: string;
  exportMessage: string;
  onRegenerate: () => void;
  onSave: () => void;
}) {
  const dietSrc = useImageUrl(advice.images?.dietKey ?? advice.images?.dietUrl);
  const exerciseSrc = useImageUrl(advice.images?.exerciseKey ?? advice.images?.exerciseUrl);
  const isDoubaoReady = advice.images?.source === 'doubao';
  const fallbackMessage = isDoubaoReady ? undefined : '豆包配图暂不可用';

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]" ref={cardRef}>
      <section className="card bg-[#FCE96A]">
        <p className="badge inline-block bg-white">今天 · {advice.date}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">今天好好吃饭，也温柔地动一动。</h1>
        <p className="mt-4 text-lg text-[#514c45]">{advice.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onRegenerate} className="btn btn-primary" type="button" disabled={isGenerating}>
            {isGenerating ? '生成中...' : '重新生成'}
          </button>
          <button onClick={onSave} className="btn bg-white" type="button" disabled={isExporting}>
            {isExporting ? '导出中...' : '保存卡片'}
          </button>
        </div>
        {exportMessage ? <p className="mt-3 rounded-2xl bg-white/75 p-3 text-sm font-bold text-[#514c45]">{exportMessage}</p> : null}
        {advice.warning ? <p className="mt-4 rounded-2xl bg-white/75 p-4 font-bold text-[#8a4b00]">⚠️ {advice.warning}</p> : null}
      </section>

      <section className="card">
        <h2 className="text-2xl font-black">今日指标</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Object.entries({
            BMR: advice.metrics.bmr,
            TDEE: advice.metrics.tdee,
            目标热量: advice.metrics.targetCalories,
            BMI: advice.metrics.bmi,
            蛋白质: `${advice.metrics.protein}g`,
            碳水: `${advice.metrics.carbs}g`,
          }).map(([label, value]) => (
            <div className="rounded-2xl bg-[#F7F4ED] p-4" key={label}>
              <p className="text-sm text-[#6b665f]">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <Illustration
          type="food"
          imageUrl={dietSrc.url}
          proxied={isDoubaoReady}
          loading={(isGenerating || dietSrc.loading) && !isDoubaoReady}
          fallbackMessage={fallbackMessage}
          onRetry={onRegenerate}
        />
        <h2 className="mt-4 text-2xl font-black">🥗 饮食卡片</h2>
        {imageError && !isDoubaoReady ? (
          <p className="mt-3 rounded-2xl bg-[#F7F4ED] p-3 text-sm text-[#6b665f]">原因：{imageError}</p>
        ) : null}
        <div className="mt-3 grid gap-3">
          {advice.meals.map((meal) => (
            <div key={meal.name} className="rounded-2xl bg-[#FFD6E0]/60 p-4">
              <b>{meal.name}</b>
              <p>{meal.items}</p>
              <small>
                {meal.calories} kcal · 蛋白 {meal.protein}g
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <Illustration
          type="sport"
          imageUrl={exerciseSrc.url}
          proxied={isDoubaoReady}
          loading={(isGenerating || exerciseSrc.loading) && !isDoubaoReady}
          fallbackMessage={fallbackMessage}
          onRetry={onRegenerate}
        />
        <h2 className="mt-4 text-2xl font-black">🏃 运动卡片</h2>
        <p className="mt-3 text-xl font-bold">
          {advice.exercise.type} · {advice.exercise.minutes} 分钟
        </p>
        <p className="text-[#514c45]">强度：{advice.exercise.intensity}</p>
        <p className="mt-3 rounded-2xl bg-[#B8E1FF]/50 p-4">{advice.exercise.note}</p>
        {!log ? <p className="mt-4 rounded-2xl bg-[#7FE0B5]/35 p-4 font-bold">今晚记得来完成饮食、运动、体重和心情打卡。</p> : null}
      </section>
    </div>
  );
}
