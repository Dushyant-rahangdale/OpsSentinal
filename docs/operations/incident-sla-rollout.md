# Incident SLA policy rollout

## Deployment

1. Back up PostgreSQL and verify legacy service SLA targets are valid.
2. Apply migrations before deploying application replicas.
3. Verify the seeded workspace policy and per-service policy versions are sealed.
4. Roll out new application replicas, create a synthetic incident, and verify target, source, capture timestamp, policy ID, version, and rule.
5. Change a policy, confirm the existing incident remains unchanged, and confirm a new incident captures the new version.
6. Drain old replicas and monitor `opsknight_incident_sla_legacy_captures`.

Alert if the legacy capture counter increases after rollout stabilization. Keep the compatibility trigger until it has remained unchanged for seven continuous days under normal traffic.

## Rollback

Application rollback is supported: the additive schema and compatibility trigger support old writers. Schema rollback is not a normal recovery path because incidents may reference immutable policy history. Prefer application rollback followed by a forward database/application fix; do not destructively remove policy provenance.

## Verification queries

Confirm no unsealed policy is selected by readers and inspect recent fallback activity:

```sql
SELECT "scopeKey", "version", "sealedAt" FROM "IncidentSlaPolicy" ORDER BY "scopeKey", "version";
SELECT * FROM "IncidentSlaLegacyCapture" ORDER BY "day" DESC LIMIT 14;
SELECT "id", "slaPolicyId", "slaPolicyVersion", "slaPolicyRule", "slaTargetSource"
FROM "Incident" ORDER BY "createdAt" DESC LIMIT 20;
```
