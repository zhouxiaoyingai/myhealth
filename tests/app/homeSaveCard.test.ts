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

vi.mock('@/lib/repo', () => ({
  useRepository: () => repo,
}));

vi.mock('@/lib/useImageUrl', () => ({
  useImageUrl: (src?: string) => ({ url: src, loading: false }),
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
