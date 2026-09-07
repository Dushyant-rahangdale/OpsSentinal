# Status page audit implementation

This change preserves page-local publication rules, the relational model, lifecycle locking,
and notification delivery. Completion requires all items below, with verification evidence.

- [x] Phase 0: access state, lifecycle bypass, empty mappings, limits, privacy, maintenance, SEO.
- [x] Phase 1: sanitized canonical snapshot and bounded projection.
- [x] Phase 2: durable invalidation, rebuild ownership, and reconciliation.
- [x] Phase 3: HTML, JSON, and RSS consume the same projection.
- [x] Phase 4: public caching, stale responses, and protected-page revocation.
- [x] Phase 5: authenticated domain routing with a last-valid stale fallback.
- [x] Phase 6: section-owned editor mutation contracts.
- [x] Phase 7: atomic optimistic concurrency for configuration mutations.
- [x] Phase 8: subscription domain service, generic responses, hashed tokens, POST confirmation.
- [x] Phase 9: separate logo assets and compatibility handling.
- [x] Phase 10: guided draft creation, publication state, accurate subscriber/service counts.
- [x] Documentation and configuration-effectiveness, isolation, and database-backed projection verification.

Do not describe unchecked items as complete. A database-backed snapshot alone does not provide
database-outage survival; deployment of a separate serving store is part of that contract.
