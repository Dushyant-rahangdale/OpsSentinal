import { describe, expect, it } from 'vitest';
import {
  PRIVATE_STATUS_CACHE_CONTROL,
  PUBLIC_STATUS_CACHE_CONTROL,
} from '@/lib/status-pages/cache-policy';

describe('status-page cache revocation policy', () => {
  it('requires shared caches to revalidate every public representation', () => {
    expect(PUBLIC_STATUS_CACHE_CONTROL).toContain('s-maxage=0');
    expect(PUBLIC_STATUS_CACHE_CONTROL).toContain('must-revalidate');
    expect(PUBLIC_STATUS_CACHE_CONTROL).not.toContain('stale-while-revalidate');
    expect(PUBLIC_STATUS_CACHE_CONTROL).not.toContain('stale-if-error');
  });

  it('never stores authenticated status-page representations', () => {
    expect(PRIVATE_STATUS_CACHE_CONTROL).toBe('private, no-store');
  });
});
