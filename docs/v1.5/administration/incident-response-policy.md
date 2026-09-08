# Incident Response Policy

OpsKnight separates four concepts that are often confused:

- **Alert severity** (`critical`, `error`, `warning`, `info`) describes the provider signal.
- **Priority** (`P1`–`P5`) describes the response obligation and selects the SLA target.
- **Urgency** (`HIGH`, `MEDIUM`, `LOW`) controls notification intensity and quiet-hours behavior.
- **SLA contract** is the immutable target and policy provenance captured when an incident is created.

Configure the workspace policy at **Settings → Incident Response Policy**. Changes publish a new append-only version and apply only to future incidents.

## Target precedence

For a prioritized incident OpsKnight resolves targets in this order:

1. Service priority override.
2. Workspace priority target.
3. Explicit service fallback target.
4. Workspace fallback target.

An unprioritized incident uses the explicit service fallback or workspace fallback. The selected priority, policy ID, version, rule, and targets are stored on the incident. Changing its display priority later does not rewrite the SLA contract.

## Classification precedence

Explicit priority or urgency supplied by a trusted creation path wins. Otherwise OpsKnight evaluates integration, service, and workspace severity mappings in that order. Provider adapters normalize payloads; the central classifier owns product semantics. The optional urgency-to-priority fallback is disabled by default so paging intensity and response obligation remain independent.

The upgrade policy preserves the existing behavior:

| Alert severity | Priority | Urgency |
| -------------- | -------- | ------- |
| Critical       | P1       | High    |
| Error          | P2       | Medium  |
| Warning        | P3       | Medium  |
| Info           | P5       | Low     |

## Acknowledgement applicability

A monitoring source that recovers before the acknowledgement deadline makes ACK **Not required**. Recovery after the deadline remains **Breached**. Manual, automation, timeout, and unknown resolution without explicit acknowledgement also remain **Breached**. This prevents a late recovery from erasing a missed human-response obligation.

ACK compliance excludes not-required incidents from its denominator. Acknowledgement rate still counts only explicit acknowledgement. MTTA includes only acknowledged incidents; MTTR includes valid resolved incidents.

## Upgrade and rollback

Apply database migrations before deploying all new application replicas. Mixed versions remain safe: the database trigger implements the same target precedence, and the classifier retains the legacy severity mapping while the additive policy table is unavailable.

Rollback application replicas without deleting policy versions or captured incident fields. Old readers ignore additive fields. Do not reverse or edit sealed policies; publish a new policy version to change behavior.
