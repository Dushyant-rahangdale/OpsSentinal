# Incident Response Policy

OpsKnight separates four concepts that are often confused:

- **Alert severity** (`critical`, `error`, `warning`, `info`) describes the provider signal.
- **Priority** (`P1`–`P5`) is an optional response-obligation classification and can select an SLA target.
- **Urgency** (`HIGH`, `MEDIUM`, `LOW`) controls notification intensity and quiet-hours behavior.
- **SLA contract** is the immutable target and policy provenance captured when an incident is created.

Configure the workspace policy at **Settings → Incident Response Policy**. Changes publish a new append-only version and apply only to future incidents. Existing incident response contracts are never rewritten by later policy changes.

## Target precedence

For a prioritized incident OpsKnight resolves response targets in this order:

1. Service priority override.
2. Workspace priority target.
3. Explicit service fallback target.
4. Workspace fallback target.

An unprioritized incident uses the explicit service fallback or workspace fallback. The selected priority-at-capture, policy ID, version, rule, and targets are stored on the incident. Changing an incident's display priority later does not rewrite its SLA contract.

## Alert classification

The v2 classification control plane is intentionally **workspace scoped** so the product UI and runtime expose one complete, auditable authority. Provider integrations normalize their native signal into one of the four alert severities; the workspace policy then determines urgency and, only when configured, an automatic incident priority.

The upgrade default preserves the pre-v2 behavior:

| Alert severity | Automatic priority | Urgency |
| -------------- | ------------------ | ------- |
| Critical       | None               | High    |
| Error          | None               | Medium  |
| Warning        | None               | Medium  |
| Info           | None               | Low     |

This matters because urgency and priority serve different purposes. A critical provider signal can page loudly without silently converting the incident into a P1 response obligation. Administrators can explicitly choose a P1–P5 value for any severity mapping. They can also enable the optional urgency fallback (`HIGH → P1`, `MEDIUM → P3`, `LOW → P5`) when that coupling is desired.

Explicit priority or urgency supplied by a trusted incident-creation path remains authoritative. Classification provenance is captured on new incidents when the workspace policy influences the result.

## Acknowledgement applicability

A monitoring source that recovers on or before the acknowledgement target makes ACK **Not required**. Recovery after the target remains **Breached**. Manual, automation, timeout, and unknown resolution without explicit acknowledgement also remain **Breached**. This prevents a late recovery from erasing a missed human-response obligation.

ACK compliance excludes not-required incidents from its denominator. Acknowledgement rate still counts only explicit acknowledgement. MTTA includes only acknowledged incidents; MTTR includes valid resolved incidents.

## Service policy behavior

Services can override response SLA targets independently of alert classification. A service priority override wins first; otherwise a workspace priority target can apply. An explicit non-inheriting service base is used before the workspace fallback. Service Tier is informational catalog metadata and does not control incident response SLA.

## Upgrade and rollback

Apply database migrations before deploying all new application replicas. The migration allocates a new workspace SLA policy version from the latest sealed version rather than assuming a fixed version number, preserves current workspace base targets and administrator-authored priority rules, and removes only known generated legacy service-priority rules.

Mixed versions remain safe: legacy writers still receive target capture from the database trigger, resolution provenance fails closed to `UNKNOWN` where an older writer cannot provide it, and the classifier retains the historical severity-to-urgency behavior while the additive classification table is unavailable.

Rollback application replicas without deleting policy versions or captured incident fields. Old readers ignore additive fields. Do not reverse or edit sealed policies; publish a new policy version to change future behavior.
