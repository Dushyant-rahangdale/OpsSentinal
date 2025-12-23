type RateLimitState = {
    count: number;
    resetAt: number;
};

const store = new Map<string, RateLimitState>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = store.get(key);

    if (!current || now >= current.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (current.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    const next = { count: current.count + 1, resetAt: current.resetAt };
    store.set(key, next);
    return { allowed: true, remaining: limit - next.count, resetAt: next.resetAt };
}

