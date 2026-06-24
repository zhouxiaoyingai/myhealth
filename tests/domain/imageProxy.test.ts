import { describe, expect, it } from 'vitest';
import { buildProxiedImageUrl } from '../../src/components/Illustration';

describe('image proxy url builder', () => {
  it('encodes the original URL into the proxy query string', () => {
    const original = 'https://tos-sg-x-ct01.tos-cn-beijing.volces.com/seedream/abc.png?X-Tos-Expires=86400&x=y';
    const proxied = buildProxiedImageUrl(original);

    expect(proxied.startsWith('/api/image-proxy?url=')).toBe(true);
    const decoded = decodeURIComponent(proxied.split('url=')[1]);
    expect(decoded).toBe(original);
  });
});
