import { beforeEach, describe, expect, it } from 'vitest';
import {
  getProviderCapacity,
  recordCapacityPressure,
  recordHealthyCapacity,
  resetProviderCapacityForTests,
  usesBulkCapacity,
} from '@/lib/provider-capacity';

describe('provider capacity', () => {
  beforeEach(resetProviderCapacityForTests);

  it('supports configured rates above 100 without exceeding the safety ceiling', () => {
    const capacity = getProviderCapacity('EMAIL', 'resend', {
      NODE_ENV: 'test',
      NOTIFICATION_EMAIL_RATE_PER_SECOND: '1000',
      NOTIFICATION_EMAIL_MAX_IN_FLIGHT: '250',
      NOTIFICATION_BULK_SHARE: '0.8',
    });
    expect(capacity).toMatchObject({
      configuredRatePerSecond: 1000,
      effectiveRatePerSecond: 1000,
      bulkRatePerSecond: 800,
      maxInFlight: 250,
    });
  });

  it('prefers provider-account capacity over the channel default', () => {
    const capacity = getProviderCapacity('EMAIL', 'sendgrid-prod/us', {
      NODE_ENV: 'test',
      NOTIFICATION_EMAIL_RATE_PER_SECOND: '100',
      NOTIFICATION_EMAIL_MAX_IN_FLIGHT: '20',
      NOTIFICATION_EMAIL_SENDGRID_PROD_US_RATE_PER_SECOND: '25',
      NOTIFICATION_EMAIL_SENDGRID_PROD_US_MAX_IN_FLIGHT: '4',
    });
    expect(capacity.configuredRatePerSecond).toBe(25);
    expect(capacity.maxInFlight).toBe(4);
  });

  it('halves on pressure and recovers additively without exceeding configuration', () => {
    process.env.NOTIFICATION_EMAIL_RATE_PER_SECOND = '500';
    expect(recordCapacityPressure('EMAIL', 'resend')).toBe(250);
    expect(recordCapacityPressure('EMAIL', 'resend')).toBe(125);
    expect(recordHealthyCapacity('EMAIL', 'resend')).toBe(150);
    delete process.env.NOTIFICATION_EMAIL_RATE_PER_SECOND;
  });

  it('reserves capacity from public and bulk traffic', () => {
    expect(usesBulkCapacity('PUBLIC_INCIDENT')).toBe(true);
    expect(usesBulkCapacity('BULK')).toBe(true);
    expect(usesBulkCapacity('CRITICAL')).toBe(false);
  });
});
