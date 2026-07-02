import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import type { DailyLog } from '@/domain/types';

const repo = {
  mode: 'supabase' as const,
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

vi.mock('@/lib/repo', () => ({
  useRepository: () => repo,
}));

vi.mock('@/lib/supabase/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1', email: 'me@example.com' },
    session: null,
    configured: true,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe('Settings migration entry', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    repo.getSettings.mockResolvedValue({ theme: 'system' });
    repo.getProfile.mockResolvedValue(sampleProfile);
    repo.getAdvice.mockResolvedValue(null);
    repo.getLog.mockResolvedValue(null);

    const adviceA = generateAdvice(sampleProfile, '2026-07-01');
    const adviceB = generateAdvice(sampleProfile, '2026-07-02');
    const log: DailyLog = {
      date: '2026-07-02',
      mealsActual: { breakfast: '燕麦', lunch: '', dinner: '', snack: '' },
      exerciseActual: { type: '', minutes: 0, intensity: '', note: '' },
      mood: 4,
      moodNote: '',
      updatedAt: '2026-07-02T08:00:00.000Z',
    };
    window.localStorage.setItem(
      'myhealth.local.v1',
      JSON.stringify({
        profile: sampleProfile,
        advices: { [adviceA.date]: adviceA, [adviceB.date]: adviceB },
        logs: { [log.date]: log },
        settings: { theme: 'system' },
      }),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('opens migration modal from settings and previews local data counts', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page');

    await act(async () => {
      root.render(React.createElement(SettingsPage));
    });

    const button = await findButtonByText('迁移本地数据');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await waitForText('本地档案 1 条');
    expect(document.body.textContent).toContain('建议 2 天');
    expect(document.body.textContent).toContain('打卡 1 天');
  });
});

async function findButtonByText(text: string): Promise<HTMLButtonElement> {
  for (let i = 0; i < 20; i += 1) {
    const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    );
    if (button instanceof HTMLButtonElement) return button;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(`Button not found: ${text}`);
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
