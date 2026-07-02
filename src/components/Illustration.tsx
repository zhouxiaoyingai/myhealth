import { useEffect, useState, type ReactNode } from 'react';

type IllustrationProps = {
  type: 'food' | 'sport';
  imageUrl?: string;
  alt?: string;
  variant?: 'default' | 'compact';
  proxied?: boolean;
  loading?: boolean;
  fallbackMessage?: string;
  onRetry?: () => void;
};

export function buildProxiedImageUrl(originalUrl: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

export function Illustration({
  type,
  imageUrl,
  alt,
  variant = 'default',
  proxied,
  loading,
  fallbackMessage,
  onRetry,
}: IllustrationProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const isFood = type === 'food';
  const remoteImageClass =
    variant === 'compact'
      ? isFood
        ? 'h-32 w-full rounded-[20px] bg-[#fffefa] object-cover'
        : 'h-32 w-full rounded-[20px] bg-[#e8f6ff] object-contain'
      : isFood
        ? 'h-44 w-full rounded-[24px] bg-[#fffefa] object-cover'
        : 'aspect-[16/9] w-full rounded-[24px] bg-[#e8f6ff] object-contain';
  const altText = alt || (isFood ? '饮食建议配图' : '运动建议配图');

  useEffect(() => {
    setImageLoadFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageLoadFailed) {
    const src = proxied ? buildProxiedImageUrl(imageUrl) : imageUrl;
    return (
      <div className="relative">
        {/* Remote Doubao URLs are short-lived and not known at build time. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          className={remoteImageClass}
          alt={altText}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImageLoadFailed(true)}
        />
        {loading ? <Watermark tone="loading">图片生成中...</Watermark> : <Watermark tone="ai">AI 生成</Watermark>}
        {fallbackMessage ? <FallbackBadge message={fallbackMessage} onRetry={onRetry} /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox="0 0 320 170"
        className={variant === 'compact' ? 'h-32 w-full rounded-[20px] bg-[#fffefa]' : 'h-44 w-full rounded-[24px] bg-[#fffefa]'}
        role="img"
        aria-label={isFood ? '饮食插图' : '运动插图'}
      >
        <rect width="320" height="170" rx="24" fill={isFood ? '#FFD6E0' : '#B8E1FF'} />
        <circle cx="70" cy="80" r="46" fill="#fff" />
        <circle cx="70" cy="80" r="30" fill={isFood ? '#7FE0B5' : '#C5B0F4'} />
        <rect x="145" y="42" width="116" height="20" rx="10" fill="#171717" opacity=".85" />
        <rect x="145" y="76" width="145" height="16" rx="8" fill="#fff" opacity=".9" />
        <rect x="145" y="106" width="96" height="16" rx="8" fill="#fff" opacity=".75" />
        <text x="22" y="148" fontSize="13" fontWeight="700" fill="#514c45">
          AI 生成
        </text>
      </svg>
      {imageLoadFailed ? <FallbackBadge message="图片加载失败，已显示占位图" onRetry={onRetry} /> : null}
      {!imageLoadFailed && fallbackMessage ? <FallbackBadge message={fallbackMessage} onRetry={onRetry} /> : null}
    </div>
  );
}

function Watermark({ tone, children }: { tone: 'ai' | 'loading'; children: ReactNode }) {
  const cls =
    tone === 'loading'
      ? 'bg-[#171717]/70 text-white'
      : 'bg-white/85 text-[#514c45] border border-[#eee4d8]';
  return (
    <span className={`pointer-events-none absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {children}
    </span>
  );
}

function FallbackBadge({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="absolute top-3 left-3 max-w-[80%] rounded-2xl bg-white/90 px-3 py-2 text-[12px] text-[#514c45] shadow-sm">
      <p className="font-bold">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-full bg-[#171717] px-3 py-1 text-[11px] font-bold text-white"
        >
          重新生成
        </button>
      ) : null}
    </div>
  );
}
