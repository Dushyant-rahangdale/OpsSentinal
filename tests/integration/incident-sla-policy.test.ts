import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { applyIncidentCreation } from '@/lib/incidents/creation';
import { resolveNewIncidentSlaContract } from '@/lib/incident-sla/contract';
import { createTestService, resetDatabase, testPrisma } from '../helpers/test-db';

describe('incident SLA policy database invariants', () => {
  beforeEach(resetDatabase);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  async function createSealedServicePolicy(
    serviceId: string,
    version: number,
    baseAckTargetMs: number,
    baseResolveTargetMs: number,
    rules: Array<{ priority: string; ackTargetMs: number; resolveTargetMs: number }> = []
  ) {
    const policy = await testPrisma.incidentSlaPolicy.create({
      data: {
        scopeKey: `service:${serviceId}`,
        version,
        inheritWorkspace: false,
        baseAckTargetMs,
        baseResolveTargetMs,
        rules: { create: rules },
      },
    });
    return testPrisma.incidentSlaPolicy.update({
      where: { id: policy.id },
      data: { sealedAt: new Date() },
    });
  }

  it('uses service overrides and falls through removed rules to workspace priority', async () => {
    const service = await createTestService('SLA policy service');
    await createSealedServicePolicy(service.id, 1, 10 * 60_000, 90 * 60_000, [
      { priority: 'P1', ackTargetMs: 5 * 60_000, resolveTargetMs: 60 * 60_000 },
    ]);

    const base = await testPrisma.$transaction(tx =>
      resolveNewIncidentSlaContract(tx, { serviceId: service.id, now: new Date() })
    );
    const overridden = await testPrisma.$transaction(tx =>
      resolveNewIncidentSlaContract(tx, {
        serviceId: service.id,
        priority: 'P1',
        now: new Date(),
      })
    );
    expect(base).toMatchObject({
      ackTargetMs: 10 * 60_000,
      resolveTargetMs: 90 * 60_000,
      source: 'SERVICE_DEFAULT',
      policyVersion: 1,
    });
    expect(overridden).toMatchObject({
      ackTargetMs: 5 * 60_000,
      resolveTargetMs: 60 * 60_000,
      source: 'SERVICE_PRIORITY_OVERRIDE',
      policyRule: 'P1',
    });

    await createSealedServicePolicy(service.id, 2, 20 * 60_000, 180 * 60_000);
    const afterRemoval = await testPrisma.$transaction(tx =>
      resolveNewIncidentSlaContract(tx, {
        serviceId: service.id,
        priority: 'P1',
        now: new Date(),
      })
    );
    expect(afterRemoval).toMatchObject({
      ackTargetMs: 5 * 60_000,
      resolveTargetMs: 60 * 60_000,
      source: 'WORKSPACE_PRIORITY_OVERRIDE',
      policyVersion: 1,
      policyRule: 'P1',
    });
  });

  it('prevents a sealed policy from being changed, deleted, or extended', async () => {
    const service = await createTestService('Immutable SLA service');
    const policy = await createSealedServicePolicy(service.id, 1, 60_000, 120_000);

    await expect(
      testPrisma.incidentSlaPolicyRule.create({
        data: {
          policyId: policy.id,
          priority: 'P1',
          ackTargetMs: 30_000,
          resolveTargetMs: 90_000,
        },
      })
    ).rejects.toThrow();
    await expect(
      testPrisma.incidentSlaPolicy.update({
        where: { id: policy.id },
        data: { baseAckTargetMs: 90_000 },
      })
    ).rejects.toThrow();
    await expect(
      testPrisma.incidentSlaPolicy.delete({ where: { id: policy.id } })
    ).rejects.toThrow();
  });

  it('allows draft construction and exactly one pure sealing transition', async () => {
    const service = await createTestService('Draft SLA service');
    const draft = await testPrisma.incidentSlaPolicy.create({
      data: {
        scopeKey: `service:${service.id}`,
        version: 1,
        inheritWorkspace: false,
        baseAckTargetMs: 60_000,
        baseResolveTargetMs: 120_000,
      },
    });
    const rule = await testPrisma.incidentSlaPolicyRule.create({
      data: {
        policyId: draft.id,
        priority: 'P1',
        ackTargetMs: 30_000,
        resolveTargetMs: 90_000,
      },
    });
    const sealed = await testPrisma.incidentSlaPolicy.update({
      where: { id: draft.id },
      data: { sealedAt: new Date() },
    });
    expect(sealed.sealedAt).not.toBeNull();
    await expect(
      testPrisma.incidentSlaPolicy.update({
        where: { id: draft.id },
        data: { sealedAt: new Date(Date.now() + 1_000) },
      })
    ).rejects.toThrow();
    await expect(
      testPrisma.incidentSlaPolicyRule.update({
        where: { id: rule.id },
        data: { label: 'changed' },
      })
    ).rejects.toThrow();
    await expect(
      testPrisma.incidentSlaPolicyRule.delete({ where: { id: rule.id } })
    ).rejects.toThrow();
  });

  it('rejects corrupt target ordering at the database boundary', async () => {
    await expect(
      testPrisma.incidentSlaPolicy.create({
        data: {
          scopeKey: 'service:corrupt',
          version: 1,
          inheritWorkspace: false,
          baseAckTargetMs: 120_000,
          baseResolveTargetMs: 60_000,
        },
      })
    ).rejects.toThrow();
    await expect(
      testPrisma.incidentSlaPolicy.create({
        data: {
          scopeKey: 'service:',
          version: 1,
          inheritWorkspace: false,
          baseAckTargetMs: 60_000,
          baseResolveTargetMs: 120_000,
        },
      })
    ).rejects.toThrow();
  });

  it('records actionable diagnostics for a legacy writer', async () => {
    const service = await createTestService('Legacy SLA writer');
    const incident = await testPrisma.incident.create({
      data: {
        title: 'Legacy explicit contract',
        serviceId: service.id,
        slaAckTargetMs: 60_000,
        slaResolveTargetMs: 120_000,
      },
    });
    const diagnostic = await testPrisma.incidentSlaLegacyCapture.findFirstOrThrow();

    expect(diagnostic).toMatchObject({
      count: BigInt(1),
      lastIncidentId: incident.id,
      lastServiceId: service.id,
      lastCaptureKind: 'EXPLICIT_NO_PROVENANCE',
    });
  });

  it('uses the application resolver without incrementing the legacy fallback counter', async () => {
    const service = await createTestService('Application SLA service');
    const result = await testPrisma.$transaction(tx =>
      applyIncidentCreation(tx, {
        title: 'Application-created incident',
        serviceId: service.id,
        urgency: 'HIGH',
        source: 'REST_API',
        now: new Date(),
      })
    );
    const incident = await testPrisma.incident.findUniqueOrThrow({ where: { id: result.id } });
    const legacyCaptures = await testPrisma.incidentSlaLegacyCapture.aggregate({
      _sum: { count: true },
    });

    expect(incident).toMatchObject({
      slaPolicyId: 'test-incident-sla-workspace-v1',
      slaPolicyVersion: 1,
      slaPolicyRule: 'BASE',
      slaTargetSource: 'WORKSPACE_DEFAULT',
    });
    expect(legacyCaptures._sum.count ?? BigInt(0)).toBe(BigInt(0));
  });
});
