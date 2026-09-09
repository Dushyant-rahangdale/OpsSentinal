import { describe, expect, it } from 'vitest';
import { scalingFeatureEnabled } from '@/lib/scaling-feature-flags';

describe('scaling rollout flags', () => {
  it('keeps the external serving store opt-in', () => {
    expect(scalingFeatureEnabled('STATUS_PAGE_EXTERNAL_SERVING_STORE', { NODE_ENV: 'test' })).toBe(
      false
    );
    expect(
      scalingFeatureEnabled('STATUS_PAGE_EXTERNAL_SERVING_STORE', {
        NODE_ENV: 'test',
        STATUS_PAGE_EXTERNAL_SERVING_STORE: 'true',
      })
    ).toBe(true);
  });

  it('accepts explicit boolean strings only', () => {
    expect(
      scalingFeatureEnabled('STATUS_PAGE_EXTERNAL_SERVING_STORE', {
        NODE_ENV: 'test',
        STATUS_PAGE_EXTERNAL_SERVING_STORE: 'yes',
      })
    ).toBe(false);
  });
});
