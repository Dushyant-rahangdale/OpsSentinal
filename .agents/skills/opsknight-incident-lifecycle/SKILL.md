---
name: opsknight-incident-lifecycle
description: Expert runbook for incident creation, escalation policies, SLA tracking, and timeline event logging.
---

# OpsKnight Incident Lifecycle Runbook

Use this skill when modifying incident creation workflows, escalation policy execution, SLA tracking, or event dispatching.

## Incident Creation Invariants
1. **Deduplication Check**:
   Before creating an incident, check if an open incident exists with matching `(serviceId, dedupKey)`:
   ```typescript
   const existing = await prisma.incident.findFirst({
     where: {
       serviceId,
       dedupKey,
       status: { in: ['OPEN', 'ACKNOWLEDGED'] },
     },
   });
   ```
2. **Immutable SLA Snapshot**:
   Capture effective SLA targets at creation:
   - `slaAckTargetMs`: Target response time in milliseconds
   - `slaResolveTargetMs`: Target resolution time in milliseconds
   - `slaTargetSource`: Provenance contract (e.g. `'service'` or `'priority'`)
   - `slaTargetCapturedAt`: Timestamp of snapshot
3. **Audit Event Logging**:
   Every state transition (`OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`) must create a corresponding `IncidentEvent` record with the actor's ID and timestamp.
