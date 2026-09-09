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
hard safety bound. Adaptive backpressure should remain enabled. Bulk concurrency is bounded below
the provider maximum so critical/transactional delivery retains reserved in-flight capacity.

The operations page shows effective capacity, leases, campaigns, and bulk pause state. Pausing bulk
delivery leaves critical and transactional workers running. Provider credentials remain in the
encrypted provider store.

Provider/account overrides use
`NOTIFICATION_<CHANNEL>_<PROVIDER_ACCOUNT>_RATE_PER_SECOND` and
`NOTIFICATION_<CHANNEL>_<PROVIDER_ACCOUNT>_MAX_IN_FLIGHT`. Non-alphanumeric characters in the
provider account key become underscores. The precedence is provider account, channel, then the
built-in system default. Queue claims cap each tenant within each traffic class so a large public
campaign cannot consume an entire worker batch.

Subscriber delivery state is explicit: pending, active, unsubscribed, suppressed, bounced, or
complained. Provider feedback is idempotent by provider event ID. Hard bounces, complaints,
invalid recipients, and provider suppressions stop later delivery; three soft bounces transition a
subscriber to bounced. The worker revalidates this state immediately before provider submission.

Public HTML, JSON, and RSS serve published snapshots only. Set
`STATUS_PAGE_SERVING_STORE_URL` and `STATUS_PAGE_SERVING_STORE_TOKEN` for an external store and
opt in with `STATUS_PAGE_EXTERNAL_SERVING_STORE=true`. Privacy changes revoke the manifest before
committing. Snapshot objects are immutable and the manifest is the only mutable serving object.

The external serving store is the only runtime-gated scaling feature. The traffic-class, durable
fanout, provider-capacity, and snapshot-only contracts are schema/application invariants and are
rolled back by deploying the previous compatible application/worker version, not by unsupported
runtime flags. Roll forward by applying additive schema first, then workers, then web processes.
Keep snapshot-only public serving fail-closed during rollback.

Run combined load validation with:

```sh
k6 run -e BASE_URL=https://staging.example.com -e PUBLIC_RPS=1000 \
  -e INTERNAL_VUS=50 -e AUTH_COOKIE='next-auth.session-token=...' \
  scripts/load/status-notification-scaling.js
```

Execute subscriber campaigns at 1k, 10k, 100k, and 1M while recording PostgreSQL CPU, connections,
query rate, queue depth/age, provider throughput, worker memory, public latency, and internal p95.
Repeat with provider 429, 500, two-second latency, a 30-minute outage, PostgreSQL pressure, and a
bulk-worker termination. Acceptance requires internal p95 degradation below 15%, uninterrupted
critical paging, crash-safe campaign resume, and correct Retry-After behavior at 250/s, 500/s, and
1,000/s test ceilings.

Release SLOs are: public availability 99.99%, public p95 below 250 ms, critical queue p95 below two
seconds, transactional queue p95 below ten seconds, snapshot publication p95 below 60 seconds,
zero false-green responses, and zero duplicate lifecycle deliveries. Run public traffic at 100,
500, 1,000, and 5,000 RPS. The final mixed test combines 1,000 public RPS, a 1M-recipient campaign,
critical responder traffic, and internal incident traffic. Store the dated k6 output and database,
worker, provider, bounce, complaint, and queue telemetry with the release record; targets without
recorded evidence do not count as certification.
