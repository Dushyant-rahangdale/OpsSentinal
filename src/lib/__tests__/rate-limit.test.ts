import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
    it('enforces limits within a window', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

        const key = 'test-rate-limit';
        const windowMs = 1000;
        const limit = 2;

        expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
        expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
        expect(checkRateLimit(key, limit, windowMs).allowed).toBe(false);

        vi.setSystemTime(new Date('2025-01-01T00:00:01.001Z'));
        expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);

        vi.useRealTimers();
    });
});

