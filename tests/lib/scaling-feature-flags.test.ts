import { describe, expect, it } from 'vitest';
import { scalingFeatureEnabled } from '@/lib/scaling-feature-flags';

describe('scaling rollout flags', () => {
  it('defaults safety architecture on while external serving remains opt-in', () => {
    expect(scalingFeatureEnabled('STATUS_PAGE_SNAPSHOT_ONLY', { NODE_ENV: 'test' })).toBe(true);
    expect(scalingFeatureEnabled('STATUS_PAGE_EXTERNAL_SERVING_STORE', { NODE_ENV: 'test' })).toBe(
      false
    );
  });

  it('accepts explicit boolean strings only', () => {
    expect(
      scalingFeatureEnabled('NOTIFICATION_PROVIDER_CAPACITY_V2', {
        NODE_ENV: 'test',
        NOTIFICATION_PROVIDER_CAPACITY_V2: 'false',
      })
    ).toBe(false);
  });
});
