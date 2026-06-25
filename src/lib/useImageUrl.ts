'use client';

import { useEffect, useState } from 'react';

/**
 * 解析图片来源为可用的 <img src> URL：
 * - 已经是 http(s) 或 /api/image-proxy? 形式 → 原样返回
 * - 否则视为 Supabase Storage key，调用 /api/image-storage 拿 signed URL
 */
export function useImageUrl(src: string | undefined): { url: string | undefined; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ url: string | undefined; loading: boolean; error: string | null }>(() => resolveInitial(src));

  useEffect(() => {
    let cancelled = false;
    setState(resolveInitial(src));

    if (!src || isAlreadyUsable(src)) {
      return () => {
        cancelled = true;
      };
    }

    setState((s) => ({ ...s, loading: true }));

    void (async () => {
      try {
        const res = await fetch(`/api/image-storage?key=${encodeURIComponent(src)}`);
        if (!res.ok) {
          if (cancelled) return;
          setState({ url: undefined, loading: false, error: `signed URL 失败 (${res.status})` });
          return;
        }
        const data = (await res.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (data.url) {
          setState({ url: data.url, loading: false, error: null });
        } else {
          setState({ url: undefined, loading: false, error: data.error ?? '未拿到 signed URL' });
        }
      } catch (e) {
        if (cancelled) return;
        setState({ url: undefined, loading: false, error: e instanceof Error ? e.message : '网络错误' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}

function resolveInitial(src: string | undefined): { url: string | undefined; loading: boolean; error: string | null } {
  if (!src) return { url: undefined, loading: false, error: null };
  if (isAlreadyUsable(src)) return { url: src, loading: false, error: null };
  return { url: undefined, loading: true, error: null };
}

function isAlreadyUsable(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/api/image-proxy');
}
