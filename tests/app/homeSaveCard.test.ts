import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { generateAdvice, sampleProfile } from '@/domain/advice';
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

const imageUrlState = {
  loading: false,
  error: null as string | null,
  urlOverride: undefined as string | undefined,
};

vi.mock('@/lib/repo', () => ({
  useRepository: () => repo,
}));

vi.mock('@/lib/useImageUrl', () => ({
  useImageUrl: (src?: string) => ({
    url: imageUrlState.urlOverride ?? src,
    loading: imageUrlState.loading,
    error: imageUrlState.error,
  }),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('Home save card', () => {
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
        dietUrl: 'https://tos-cn-beijing.volces.com/diet.png',
        exerciseUrl: 'https://tos-cn-beijing.volces.com/exercise.png',
      },
    };

    repo.getProfile.mockResolvedValue(sampleProfile);
    repo.getAdvice.mockResolvedValue(advice);
    repo.getLog.mockResolvedValue(null);
    repo.saveAdvice.mockResolvedValue(undefined);
    vi.mocked(html2canvas).mockResolvedValue({
      toBlob: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
    } as HTMLCanvasElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:myhealth-card');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    imageUrlState.loading = false;
    imageUrlState.error = null;
    imageUrlState.urlOverride = undefined;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('exports the rendered card element when the save button is clicked', async () => {
    const { default: Home } = await import('@/app/page');

    await act(async () => {
      root.render(React.createElement(Home));
    });

    const button = await findButtonByText('保存卡片');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(html2canvas).toHaveBeenCalledTimes(1);
    expect(vi.mocked(html2canvas).mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });

  it('shows a cloud image unavailable message when signed URL lookup fails', async () => {
    imageUrlState.urlOverride = undefined;
    imageUrlState.error = '图片暂不可用';
    repo.getAdvice.mockResolvedValue({
      ...generateAdvice(sampleProfile, today()),
      images: {
        source: 'doubao' as const,
        dietKey: '00000000-0000-0000-0000-000000000000/2026-06-30/diet.png',
        exerciseKey: '00000000-0000-0000-0000-000000000000/2026-06-30/exercise.png',
      },
    });
    const { default: Home } = await import('@/app/page');

    await act(async () => {
      root.render(React.createElement(Home));
    });

    await waitForText('图片暂不可用');
  });

  it('prevents saving while advice images are still loading', async () => {
    imageUrlState.loading = true;
    imageUrlState.urlOverride = undefined;
    const { default: Home } = await import('@/app/page');

    await act(async () => {
      root.render(React.createElement(Home));
    });

    const button = await findButtonByText('图片加载中');

    expect(button.disabled).toBe(true);
    expect(html2canvas).not.toHaveBeenCalled();
  });

  it('ignores duplicate regenerate clicks while a request is already in flight', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    const { default: Home } = await import('@/app/page');

    await act(async () => {
      root.render(React.createElement(Home));
    });

    const button = await findButtonByText('重新生成');

    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitForText('正在生成建议');
  });

  it('shows temporary image messaging when cloud storage fails after image generation', async () => {
    repo.getAdvice.mockResolvedValue({
      ...generateAdvice(sampleProfile, today()),
      images: {
        source: 'doubao' as const,
        dietUrl: 'https://tos-cn-beijing.volces.com/diet.png',
        exerciseUrl: 'https://tos-cn-beijing.volces.com/exercise.png',
        errorCode: 'STORAGE_UPLOAD_FAILED' as const,
        error: '图片已生成但云端保存失败，已临时展示。',
      },
    });
    const { default: Home } = await import('@/app/page');

    await act(async () => {
      root.render(React.createElement(Home));
    });

    await waitForText('图片已生成但云端保存失败，已临时展示。');
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
