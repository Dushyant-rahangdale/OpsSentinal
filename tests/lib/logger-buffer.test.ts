import { describe, it, expect } from 'vitest';
import { logger, getLogBuffer } from '@/lib/logger';
import * as publicLogsRoute from '@/app/api/public-logs/route';
import { createMockRequest, parseResponse } from '../helpers/api-test';

describe('Logger Buffer', () => {
  it('stores log entries for later retrieval', () => {
    const message = `buffer-test-${Date.now()}`;
    logger.info(message);

    const entries = getLogBuffer(50);
    const match = entries.find((entry) => entry.message === message);
    expect(match).toBeTruthy();
  });

  it('returns the most recent entry when limited', () => {
    const first = `buffer-first-${Date.now()}`;
    const second = `buffer-second-${Date.now()}`;
    logger.info(first);
    logger.info(second);

    const entries = getLogBuffer(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe(second);
  });
});

describe('Public Logs API', () => {
  it('returns log entries without stack traces', async () => {
    const message = `public-logs-${Date.now()}`;
    logger.error(message, { error: new Error('kaboom') });

    const req = await createMockRequest('GET', '/api/public-logs?limit=50');
    const res = await publicLogsRoute.GET(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    const entries = Array.isArray(data?.data) ? data.data : [];
    const entry = entries.find((item: any) => item.message === message);
    expect(entry).toBeTruthy();
    expect(entry.error?.message).toBe('kaboom');
    expect(entry.error?.stack).toBeUndefined();
  });
});
