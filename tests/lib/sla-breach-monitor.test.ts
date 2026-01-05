import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkSLABreaches,
  formatBreachWarning,
  type BreachWarning,
} from '@/lib/sla-breach-monitor';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    incident: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('sla-breach-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('checkSLABreaches', () => {
    it('returns empty warnings when no active incidents', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

      const result = await checkSLABreaches();

      expect(result.warnings).toHaveLength(0);
      expect(result.activeIncidentCount).toBe(0);
      expect(result.warningCount).toBe(0);
    });

    it('detects ack breach warning when incident is nearing ack SLA', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      // Set current time
      const now = new Date('2026-01-05T12:00:00Z');
      vi.setSystemTime(now);

      // Incident created 12 minutes ago with 15 min ack target = 3 min remaining
      const createdAt = new Date(now.getTime() - 12 * 60 * 1000);

      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: 'inc-1',
          title: 'Test Incident',
          serviceId: 'svc-1',
          urgency: 'HIGH',
          status: 'OPEN',
          createdAt,
          acknowledgedAt: null,
          dedupKey: null,
          escalationProcessingAt: null,
          snoozedUntil: null,
          snoozeReason: null,
          service: {
            id: 'svc-1',
            name: 'Test Service',
            targetAckMinutes: 15,
            targetResolveMinutes: 120,
            slackWebhookUrl: null,
            serviceNotifyOnSlaBreach: true,
          },
        } as any,
      ] as any);

      const result = await checkSLABreaches();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].breachType).toBe('ack');
      expect(result.warnings[0].timeRemainingMs).toBeCloseTo(3 * 60 * 1000, -3);
    });

    it('detects resolve breach warning when incident is nearing resolve SLA', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const now = new Date('2026-01-05T12:00:00Z');
      vi.setSystemTime(now);

      // Incident created 110 minutes ago with 120 min resolve target = 10 min remaining
      const createdAt = new Date(now.getTime() - 110 * 60 * 1000);

      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: 'inc-1',
          title: 'Test Incident',
          serviceId: 'svc-1',
          urgency: 'MEDIUM',
          status: 'ACKNOWLEDGED',
          createdAt,
          acknowledgedAt: new Date(now.getTime() - 100 * 60 * 1000),
          dedupKey: null,
          escalationProcessingAt: null,
          snoozedUntil: null,
          snoozeReason: null,
          service: {
            id: 'svc-1',
            name: 'Test Service',
            targetAckMinutes: 15,
            targetResolveMinutes: 120,
            slackWebhookUrl: null,
            serviceNotifyOnSlaBreach: true,
          },
        },
      ] as any);

      const result = await checkSLABreaches();

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].breachType).toBe('resolve');
    });

    it('does not warn for incidents well before SLA deadline', async () => {
      const { default: prisma } = await import('@/lib/prisma');

      const now = new Date('2026-01-05T12:00:00Z');
      vi.setSystemTime(now);

      // Incident created 5 minutes ago with 15 min ack target = 10 min remaining (outside 5 min warning)
      const createdAt = new Date(now.getTime() - 5 * 60 * 1000);

      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: 'inc-1',
          title: 'Test Incident',
          serviceId: 'svc-1',
          urgency: 'LOW',
          status: 'OPEN',
          createdAt,
          acknowledgedAt: null,
          service: {
            id: 'svc-1',
            name: 'Test Service',
            targetAckMinutes: 15,
            targetResolveMinutes: 120,
            slackWebhookUrl: null,
          },
        },
      ] as any);

      const result = await checkSLABreaches();

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('formatBreachWarning', () => {
    it('formats ack warning correctly', () => {
      const warning: BreachWarning = {
        incidentId: 'inc-1',
        title: 'Test',
        serviceId: 'svc-1',
        serviceName: 'Test Service',
        breachType: 'ack',
        timeRemainingMs: 3 * 60 * 1000, // 3 minutes
        targetMinutes: 15,
        urgency: 'HIGH',
        status: 'OPEN',
        createdAt: new Date(),
      };

      const result = formatBreachWarning(warning);

      expect(result).toContain('Acknowledgment');
      expect(result).toContain('3 min');
      expect(result).toContain('15 min');
    });

    it('formats resolve warning correctly', () => {
      const warning: BreachWarning = {
        incidentId: 'inc-1',
        title: 'Test',
        serviceId: 'svc-1',
        serviceName: 'Test Service',
        breachType: 'resolve',
        timeRemainingMs: 10 * 60 * 1000, // 10 minutes
        targetMinutes: 120,
        urgency: 'MEDIUM',
        status: 'ACKNOWLEDGED',
        createdAt: new Date(),
      };

      const result = formatBreachWarning(warning);

      expect(result).toContain('Resolution');
      expect(result).toContain('10 min');
      expect(result).toContain('120 min');
    });
  });
});
