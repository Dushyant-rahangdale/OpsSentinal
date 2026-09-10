import { describe, expect, it } from 'vitest';
import { subscriptionRequestAction } from '@/lib/status-pages/subscription-policy';

describe('status page subscription request policy', () => {
  const now = Date.parse('2026-09-09T10:00:00.000Z');

  it('only allows an unsubscribed address to restart verification', () => {
    expect(subscriptionRequestAction('UNSUBSCRIBED', new Date(now), now)).toBe('REACTIVATE');
  });

  it.each(['COMPLAINED', 'SUPPRESSED', 'BOUNCED'] as const)(
    'keeps %s addresses suppressed even when another subscription is requested',
    state => {
      expect(subscriptionRequestAction(state, new Date(now - 120_000), now)).toBe('ACCEPT');
    }
  );

  it('keeps active subscriptions unchanged', () => {
    expect(subscriptionRequestAction('ACTIVE', new Date(now - 120_000), now)).toBe('ACCEPT');
  });

  it('throttles recent pending verification and refreshes an expired request', () => {
    expect(subscriptionRequestAction('PENDING', new Date(now - 59_999), now)).toBe('ACCEPT');
    expect(subscriptionRequestAction('PENDING', new Date(now - 60_000), now)).toBe(
      'REFRESH_VERIFICATION'
    );
  });
});
