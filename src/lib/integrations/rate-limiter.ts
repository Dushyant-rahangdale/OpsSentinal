/**
 * Rate Limiter for Integration Webhooks
 *
 * Token bucket algorithm for per-integration rate limiting.
 * Prevents abuse and ensures fair resource usage.
 */

import { logger } from '@/lib/logger';

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Initial burst allowance */
  burstLimit: number;
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  windowStart: number;
  requestCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Default configuration: 100 requests per minute with burst of 20
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  burstLimit: 20,
};

// In-memory storage for rate limit entries
// Key: integrationId
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ENTRY_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastRefill > ENTRY_TTL_MS) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  integrationId: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { maxRequests, windowMs, burstLimit } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  startCleanupTimer();

  let entry = rateLimitStore.get(integrationId);

  if (!entry) {
    // First request - initialize with full burst capacity
    entry = {
      tokens: burstLimit,
      lastRefill: now,
      windowStart: now,
      requestCount: 0,
    };
    rateLimitStore.set(integrationId, entry);
  }

  // Refill tokens based on time elapsed
  const elapsed = now - entry.lastRefill;
  const refillRate = maxRequests / windowMs; // tokens per ms
  const tokensToAdd = elapsed * refillRate;

  entry.tokens = Math.min(burstLimit, entry.tokens + tokensToAdd);
  entry.lastRefill = now;

  // Reset window if needed
  if (now - entry.windowStart >= windowMs) {
    entry.windowStart = now;
    entry.requestCount = 0;
  }

  // Check if request is allowed
  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    entry.requestCount += 1;

    return {
      allowed: true,
      remaining: Math.floor(entry.tokens),
      resetAt: entry.windowStart + windowMs,
    };
  }

  // Rate limited
  const retryAfterMs = (1 - entry.tokens) / refillRate;
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

  logger.warn('integration.rate_limited', {
    integrationId,
    requestCount: entry.requestCount,
    remaining: 0,
    retryAfter: retryAfterSeconds,
  });

  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.windowStart + windowMs,
    retryAfter: retryAfterSeconds,
  };
}

/**
 * Get current rate limit status without consuming a token
 */
export function getRateLimitStatus(
  integrationId: string,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const { maxRequests, windowMs, burstLimit } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  const entry = rateLimitStore.get(integrationId);

  if (!entry) {
    return {
      allowed: true,
      remaining: burstLimit,
      resetAt: now + windowMs,
    };
  }

  // Calculate current token count without modifying
  const elapsed = now - entry.lastRefill;
  const refillRate = maxRequests / windowMs;
  const currentTokens = Math.min(burstLimit, entry.tokens + elapsed * refillRate);

  return {
    allowed: currentTokens >= 1,
    remaining: Math.floor(currentTokens),
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Reset rate limit for an integration (for testing or admin override)
 */
export function resetRateLimit(integrationId: string): void {
  rateLimitStore.delete(integrationId);
}

/**
 * Reset all rate limits (for testing)
 */
export function resetAllLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get all rate limit entries (for monitoring/debugging)
 */
export function getAllRateLimits(): Map<string, RateLimitEntry> {
  return new Map(rateLimitStore);
}

/**
 * Configure global rate limit defaults
 * Note: This affects new entries, not existing ones
 */
export function configureRateLimits(config: Partial<RateLimitConfig>): RateLimitConfig {
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Rate limit middleware helper for Next.js API routes
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

// Start cleanup timer on module load to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  startCleanupTimer();
}
