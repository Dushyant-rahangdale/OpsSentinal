# Status page audit implementation

This change preserves page-local publication rules, the relational model, lifecycle locking,
and notification delivery. Completion requires all items below, with verification evidence.

- [x] Phase 0: access state, lifecycle bypass, empty mappings, limits, privacy, maintenance, SEO.
- [x] Phase 1: sanitized canonical snapshot and bounded projection.
- [x] Phase 2: durable invalidation, rebuild ownership, and reconciliation.
- [x] Phase 3: HTML, JSON, and RSS consume the same projection.
- [x] Phase 4: revocation-safe public revalidation and protected-page `no-store` policy.
- [x] Phase 5: authenticated domain routing with a last-valid stale fallback.
- [x] Phase 6: section-owned editor mutation contracts.
- [x] Phase 7: atomic optimistic concurrency for configuration mutations.
- [x] Phase 8: subscription domain service, generic responses, hashed tokens, POST confirmation.
- [x] Phase 9: separate logo assets and compatibility handling.
- [x] Phase 10: guided draft creation, publication state, accurate subscriber/service counts.
- [x] Documentation and configuration-effectiveness, isolation, and database-backed projection verification.

The in-application read plane fails closed when PostgreSQL is unavailable. A database-backed
snapshot alone does not provide database-outage survival; deployment of an independently operated
serving store is part of that contract. Its rollout must atomically publish or revoke access policy
before allowing stale delivery. OpsKnight intentionally does not advertise stale edge serving until
that deployment contract exists.
