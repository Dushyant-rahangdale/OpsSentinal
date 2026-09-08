# Status and notification scaling

OpsKnight supports an integrated process for small installations and isolated process roles for
high-volume installations. Production deployments with large subscriber lists should run separate
`web`, `scheduler`, `critical-worker`, `bulk-worker`, and `status-projector` processes from
the same image.

Use role-specific pool limits such as `DATABASE_POOL_SIZE_WEB=20`,
`DATABASE_POOL_SIZE_CRITICAL_WORKER=10`, `DATABASE_POOL_SIZE_BULK_WORKER=5`, and
`DATABASE_POOL_SIZE_STATUS_PROJECTOR=5`. Keep their sum below the PostgreSQL or PgBouncer client
limit with capacity reserved for migrations and operator access. PgBouncer transaction pooling is
recommended when replica counts make direct connection budgets impractical.

Provider throughput is controlled with `NOTIFICATION_<CHANNEL>_RATE_PER_SECOND`,
`NOTIFICATION_<CHANNEL>_MAX_IN_FLIGHT`, `NOTIFICATION_BULK_SHARE`,
`NOTIFICATION_DEPLOYMENT_RATE_CEILING`, and `NOTIFICATION_QUOTA_BLOCK_SIZE`. Start with the Safe
preset (25/s, 10 in flight, 50% bulk), move to Balanced (100/s, 50 in flight, 75% bulk), and use
High Throughput (500+/s) only after provider approval and load testing. The deployment ceiling is a
hard safety bound. Adaptive backpressure should remain enabled.

The operations page shows effective capacity, leases, campaigns, and bulk pause state. Pausing bulk
delivery leaves critical and transactional workers running. Provider credentials remain in the
encrypted provider store.

Public HTML, JSON, and RSS serve published snapshots only. Set
`STATUS_PAGE_SERVING_STORE_URL` and `STATUS_PAGE_SERVING_STORE_TOKEN` for an external store.
Privacy changes revoke the manifest before committing. Snapshot objects are immutable and the
manifest is the only mutable serving object.

Temporary rollout flags are `NOTIFICATION_TRAFFIC_CLASSES_V2`,
`NOTIFICATION_PROVIDER_CAPACITY_V2`, `STATUS_PAGE_ASYNC_FANOUT`,
`NOTIFICATION_FANOUT_CAMPAIGNS`, `STATUS_PAGE_SNAPSHOT_ONLY`, and
`STATUS_PAGE_EXTERNAL_SERVING_STORE`. Roll forward by deploying additive schema first, then
workers, then web processes. Roll back worker behavior with flags; keep snapshot-only public
serving fail-closed.

Run combined load validation with:

```sh
k6 run -e BASE_URL=https://staging.example.com -e PUBLIC_RPS=1000 \
  -e INTERNAL_VUS=50 -e AUTH_COOKIE='next-auth.session-token=...' \
  scripts/load/status-notification-scaling.js
```

Execute subscriber campaigns at 1k, 10k, and 100k while recording PostgreSQL CPU, connections,
query rate, queue depth/age, provider throughput, worker memory, public latency, and internal p95.
Repeat with provider 429, 500, two-second latency, a 30-minute outage, PostgreSQL pressure, and a
bulk-worker termination. Acceptance requires internal p95 degradation below 15%, uninterrupted
critical paging, crash-safe campaign resume, and correct Retry-After behavior at 250/s, 500/s, and
1,000/s test ceilings.
