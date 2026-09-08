import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { resolveIncidentClassification } from '@/lib/incidents/classification';

const tx = (policies: unknown[]) =>
  ({
    incidentClassificationPolicy: { findMany: vi.fn().mockResolvedValue(policies) },
  }) as unknown as Prisma.TransactionClient;

describe('incident classification', () => {
  it('uses integration, service, workspace precedence and records provenance', async () => {
    const rule = (scopeKey: string, id: string, priority: string) => ({
      id,
      scopeKey,
      version: 2,
      derivePriorityFromUrgency: false,
      rules: [{ matchType: 'ALERT_SEVERITY', matchValue: 'critical', priority, urgency: 'HIGH' }],
    });
    const result = await resolveIncidentClassification(
      tx([
        rule('workspace', 'w', 'P3'),
        rule('service:s1', 's', 'P2'),
        rule('integration:i1', 'i', 'P1'),
      ]),
      { serviceId: 's1', integrationId: 'i1', alertSeverity: 'critical' }
    );
    expect(result).toMatchObject({
      priority: 'P1',
      urgency: 'HIGH',
      policyId: 'i',
      policyVersion: 2,
    });
  });

  it('keeps explicit priority and urgency authoritative', async () => {
    expect(
      await resolveIncidentClassification(tx([]), {
        serviceId: 's1',
        explicitPriority: 'p4',
        explicitUrgency: 'LOW',
        alertSeverity: 'critical',
      })
    ).toMatchObject({
      priority: 'P4',
      urgency: 'LOW',
      prioritySource: 'EXPLICIT',
      urgencySource: 'EXPLICIT',
    });
  });

  it('preserves legacy severity behavior when policy storage is unavailable', async () => {
    const legacyTx = {} as Prisma.TransactionClient;
    await expect(
      resolveIncidentClassification(legacyTx, { serviceId: 's1', alertSeverity: 'warning' })
    ).resolves.toMatchObject({ priority: 'P3', urgency: 'MEDIUM' });
  });
});
