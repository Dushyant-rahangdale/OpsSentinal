import { beforeEach, describe, expect, it } from 'vitest';
import {
  statusDomainRequestHeaders,
  verifyStatusDomainRequest,
} from '@/lib/status-pages/internal-request';

describe('internal status domain map authentication', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'stable-test-secret';
  });

  it('accepts a current signed request and rejects tampering', async () => {
    const now = Date.now();
    const signed = await statusDomainRequestHeaders(now);
    expect(await verifyStatusDomainRequest(new Headers(signed), now)).toBe(true);
    expect(
      await verifyStatusDomainRequest(
        new Headers({ ...signed, 'x-status-map-signature': '0'.repeat(64) }),
        now
      )
    ).toBe(false);
  });

  it('rejects expired requests', async () => {
    const now = Date.now();
    expect(
      await verifyStatusDomainRequest(
        new Headers(await statusDomainRequestHeaders(now - 31_000)),
        now
      )
    ).toBe(false);
  });
});
