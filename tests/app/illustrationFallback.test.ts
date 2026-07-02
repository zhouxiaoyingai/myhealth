import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Illustration } from '@/components/Illustration';

describe('Illustration image fallback', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('switches to the built-in SVG fallback when the remote image fails to load', async () => {
    await act(async () => {
      root.render(React.createElement(Illustration, { type: 'food', imageUrl: 'https://example.com/broken.png' }));
    });

    const image = container.querySelector('img');
    expect(image).toBeInstanceOf(HTMLImageElement);

    await act(async () => {
      image?.dispatchEvent(new Event('error', { bubbles: true }));
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[role="img"]')).toBeInstanceOf(SVGSVGElement);
    expect(container.textContent).toContain('图片加载失败');
  });
});
