import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const internalLatency = new Trend('opsknight_internal_latency', true);
const publicLatency = new Trend('opsknight_public_status_latency', true);
const failures = new Rate('opsknight_request_failures');

export const options = {
  scenarios: {
    public_status: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.PUBLIC_RPS || 1000),
      timeUnit: '1s',
      duration: __ENV.DURATION || '5m',
      preAllocatedVUs: 100,
      maxVUs: 2000,
      exec: 'publicStatus',
    },
    internal_reads: {
      executor: 'constant-vus',
      vus: Number(__ENV.INTERNAL_VUS || 20),
      duration: __ENV.DURATION || '5m',
      exec: 'internalRead',
    },
  },
  thresholds: {
    opsknight_request_failures: ['rate<0.01'],
    opsknight_public_status_latency: ['p(95)<250'],
    opsknight_internal_latency: ['p(95)<750'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

export function publicStatus() {
  const response = http.get(`${baseUrl}/api/status`);
  publicLatency.add(response.timings.duration);
  failures.add(!check(response, { 'public status succeeds': r => r.status === 200 }));
}

export function internalRead() {
  const response = http.get(`${baseUrl}/api/incidents`, {
    headers: __ENV.AUTH_COOKIE ? { Cookie: __ENV.AUTH_COOKIE } : {},
  });
  internalLatency.add(response.timings.duration);
  failures.add(!check(response, { 'internal read succeeds': r => r.status === 200 }));
  sleep(0.1);
}
