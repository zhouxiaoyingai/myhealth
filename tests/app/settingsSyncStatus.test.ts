import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAdvice, sampleProfile } from '@/domain/advice';
import { today } from '@/lib/date';

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

const authState = {
  status: 'authenticated' as const,
  user: { email: 'me@example.com' },
  session: null,
  configured: true,
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('@/lib/repo', () => ({
  useRepository: () => repo,
}));

vi.mock('@/lib/supabase/AuthProvider', () => ({
  useAuth: () => authState,
}));

describe('Settings sync status', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    repo.getSettings.mockResolvedValue({ theme: 'system' });
    repo.getProfile.mockResolvedValue(sampleProfile);
    repo.getAdvice.mockResolvedValue({
      ...generateAdvice(sampleProfile, today()),
      images: {
        source: 'doubao' as const,
        dietKey: '00000000-0000-0000-0000-000000000000/2026-07-02/diet.png',
        exerciseKey: '00000000-0000-0000-0000-000000000000/2026-07-02/exercise.png',
      },
    });
    repo.getLog.mockResolvedValue(null);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('shows cloud sync status for profile, today advice, today log, and AI images', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page');

    await act(async () => {
      root.render(React.createElement(SettingsPage));
    });

    await waitForText('当前模式');
    expect(document.body.textContent).toContain('云端（Supabase）');
    expect(document.body.textContent).toContain('档案');
    expect(document.body.textContent).toContain('云端已保存');
    expect(document.body.textContent).toContain('今日建议');
    expect(document.body.textContent).toContain('云端缺失');
    expect(document.body.textContent).toContain('今日打卡');
    expect(document.body.textContent).toContain('AI 图片');
  });
});

async function waitForText(text: string): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (document.body.textContent?.includes(text)) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  throw new Error(`Text not found: ${text}`);
}
