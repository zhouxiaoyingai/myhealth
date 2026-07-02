import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import type { DailyLog } from '@/domain/types';
import { today } from '@/lib/date';

const repo = {
  mode: 'local' as const,
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  getAdvice: vi.fn(),
  saveAdvice: vi.fn(),
  listAdvices: vi.fn(),
  getLog: vi.fn(),
  upsertLog: vi.fn(),
  listLogs: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  exportJson: vi.fn(),
  clear: vi.fn(),
};

const imageUrlMock = vi.fn((src?: string) => ({ url: src, loading: false, error: null }));

vi.mock('@/lib/repo', () => ({
  useRepository: () => repo,
}));

vi.mock('@/lib/useImageUrl', () => ({
  useImageUrl: (src?: string) => imageUrlMock(src),
}));

describe('History advice images', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const advice = {
      ...generateAdvice(sampleProfile, today()),
      images: {
        source: 'doubao' as const,
        dietUrl: 'https://example.com/history-diet.png',
        exerciseUrl: 'https://example.com/history-exercise.png',
      },
    };

    repo.listAdvices.mockResolvedValue([advice]);
    repo.listLogs.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the selected day diet and exercise advice images', async () => {
    const { default: HistoryPage } = await import('@/app/history/page');

    await act(async () => {
      root.render(React.createElement(HistoryPage));
    });

    await waitForImage('当天饮食图');
    await waitForImage('当天运动图');

    expect(imageUrlMock).toHaveBeenCalledWith('https://example.com/history-diet.png');
    expect(imageUrlMock).toHaveBeenCalledWith('https://example.com/history-exercise.png');
  });

  it('renders the smart review recommendation for the selected day', async () => {
    const date = today();
    const advice = generateAdvice(sampleProfile, date);
    repo.listAdvices.mockResolvedValue([advice]);
    repo.listLogs.mockResolvedValue([
      {
        date,
        mealsActual: {
          breakfast: '燕麦酸奶',
          lunch: '',
          dinner: '鸡胸肉沙拉',
          snack: '',
        },
        exerciseActual: {
          type: advice.exercise.type,
          minutes: Math.max(0, advice.exercise.minutes - 10),
          intensity: advice.exercise.intensity,
          note: '',
        },
        weightKg: 64,
        mood: 3,
        moodNote: '',
        updatedAt: `${date}T08:00:00.000Z`,
      } satisfies DailyLog,
    ]);
    const { default: HistoryPage } = await import('@/app/history/page');

    await act(async () => {
      root.render(React.createElement(HistoryPage));
    });

    await waitForText(`明天优先补齐午餐记录，运动保持 ${advice.exercise.minutes} 分钟${advice.exercise.type}即可。`);
  });
});

async function waitForImage(alt: string): Promise<HTMLImageElement> {
  for (let i = 0; i < 20; i += 1) {
    const image = Array.from(document.querySelectorAll('img')).find((candidate) => candidate.alt === alt);
    if (image instanceof HTMLImageElement) return image;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(`Image not found: ${alt}`);
}

async function waitForText(text: string): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (document.body.textContent?.includes(text)) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(`Text not found: ${text}`);
}
