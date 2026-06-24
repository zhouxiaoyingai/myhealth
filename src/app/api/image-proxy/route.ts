import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 仅代理豆包 / 火山引擎 TOS 上的配图。其他域名拒绝，避免被滥用为通用代理。
const ALLOWED_HOSTS = [
  'volces.com',
  'tos-cn-beijing.volces.com',
  'tos-sg-x-ct01.tos-cn-beijing.volces.com',
  'ark.cn-beijing.volces.com',
  'ark.cn-beijing.ivolces.com',
];

function isAllowedUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });
  }

  if (!isAllowedUrl(target)) {
    return NextResponse.json({ error: 'URL host is not in allow list.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { cache: 'no-store' });
  } catch (error) {
    return NextResponse.json(
      { error: `Upstream fetch failed: ${error instanceof Error ? error.message : 'unknown'}` },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') || 'image/png';
  const arrayBuffer = await upstream.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
