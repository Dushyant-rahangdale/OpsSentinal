import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  resetAllMetrics as resetAllLimits,
  createRateLimitHeaders,
} from '@/lib/integrations/rate-limiter';

describe('Rate Limiter', () => {
  const testIntegrationId = 'test-integration-123';

  beforeEach(() => {
    resetRateLimit(testIntegrationId);
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit(testIntegrationId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should decrement remaining tokens', () => {
      const first = checkRateLimit(testIntegrationId);
      const second = checkRateLimit(testIntegrationId);

      expect(second.remaining).toBeLessThan(first.remaining);
    });

    it('should respect burst limit', () => {
      // Default burst is 20
      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit(testIntegrationId);
        expect(result.allowed).toBe(true);
      }

      // 21st request should be rate limited (no time to refill)
      const limited = checkRateLimit(testIntegrationId);
      expect(limited.allowed).toBe(false);
      expect(limited.retryAfter).toBeGreaterThan(0);
    });

    it('should use custom config', () => {
      const config = { maxRequests: 5, windowMs: 1000, burstLimit: 2 };

      checkRateLimit(testIntegrationId, config);
      checkRateLimit(testIntegrationId, config);

      const third = checkRateLimit(testIntegrationId, config);
      expect(third.allowed).toBe(false);
    });

    it('should track different integrations separately', () => {
      // Exhaust limit for integration 1
      for (let i = 0; i < 25; i++) {
        checkRateLimit('integration-1');
      }

      // Integration 2 should still have tokens
      const result = checkRateLimit('integration-2');
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without consuming token', () => {
      const before = checkRateLimit(testIntegrationId);
      const status = getRateLimitStatus(testIntegrationId);
      const after = checkRateLimit(testIntegrationId);

      // Status check shouldn't consume token
      expect(after.remaining).toBe(before.remaining - 1);
    });

    it('should return full capacity for unknown integration', () => {
      const status = getRateLimitStatus('unknown-integration');
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(20); // Default burst
    });
  });

  describe('resetRateLimit', () => {
    it('should reset limit for specific integration', () => {
      // Exhaust limit
      for (let i = 0; i < 25; i++) {
        checkRateLimit(testIntegrationId);
      }

      expect(checkRateLimit(testIntegrationId).allowed).toBe(false);

      // Reset
      resetRateLimit(testIntegrationId);

      // Should be allowed again
      expect(checkRateLimit(testIntegrationId).allowed).toBe(true);
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create proper headers for allowed request', () => {
      const result = { allowed: true, remaining: 15, resetAt: Date.now() + 60000 };
      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Remaining']).toBe('15');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After for rate limited request', () => {
      const result = { allowed: false, remaining: 0, resetAt: Date.now() + 60000, retryAfter: 30 };
      const headers = createRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('30');
    });
  });
});
