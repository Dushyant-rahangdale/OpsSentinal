# Analytics parity audit (expanded)

Scope

- Pages reviewed: /analytics, /analytics-new, /m/analytics, /reports/executive
- API reviewed: /api/analytics/export
- Shared metrics service reviewed: src/lib/sla-server.ts

Files

- Legacy analytics: src/app/(app)/analytics/page.tsx
- Analytics-new (V2): src/app/(app)/analytics-new/page.tsx
- Mobile analytics: src/app/(mobile)/m/analytics/page.tsx
- Executive report: src/app/(app)/reports/executive/page.tsx
- Export API: src/app/api/analytics/export/route.ts
- Metrics service: src/lib/sla-server.ts

Analytics surfaces summary

1. Desktop legacy analytics

- Route: /analytics
- Data source: direct Prisma queries inside page
- Filters: team, service, assignee, status, urgency, window
- Export: CSV URL built with all active filters
- Access: no explicit role guard (authenticated session via getServerSession)

2. Desktop analytics-new (V2)

- Route: /analytics-new
- Data source: calculateSLAMetrics (src/lib/sla-server.ts)
- Filters: team, service, assignee, status, urgency, window
- Export: only window is passed (missing other filters)
- Access: admin-only (assertAdmin)

3. Mobile analytics

- Route: /m/analytics
- Data source: direct Prisma queries (open incidents + last 7 days)
- Filters: none (fixed 7-day window)
- Export: none
- Access: no explicit role guard

4. Executive report

- Route: /reports/executive
- Data source: calculateSLAMetrics (7/30/90 days) + SLA definition snapshots
- Filters: none (fixed windows)
- Export: none
- Access: admin-only (assertAdmin)

5. Export API

- Route: /api/analytics/export
- Supports filters: team, service, assignee, status, urgency, window
- Access: responder or above (assertResponderOrAbove)

Filter parity matrix

- team: legacy yes, V2 yes, export yes, mobile no, executive no
- service: legacy yes, V2 yes, export yes, mobile no, executive no
- assignee: legacy yes, V2 yes, export yes, mobile no, executive no
- status: legacy yes, V2 yes, export yes, mobile no, executive no
- urgency: legacy yes, V2 yes, export yes, mobile no, executive no
- window: legacy yes, V2 yes, export yes, mobile fixed 7d, executive fixed 7/30/90

Access parity

- Legacy analytics: no explicit role guard
- Analytics-new: admin-only (stricter than legacy and export)
- Export API: responder or above
- Mobile analytics: no explicit role guard
- Executive report: admin-only

Export parity

- Legacy: export URL includes window + all active filters
- V2: export URL includes only window
- Export API already supports all filters

Data source and computation differences

Legacy (/analytics)

- Page performs multiple Prisma queries and computes metrics locally.
- Uses incident events to compute MTTA via ack event timestamps.
- Computes percentiles (p50/p95) for MTTA/MTTR, status age breakdown, SLA burn, auto vs manual resolve.
- Builds per-service SLA table (ack and resolve rates by service).
- Computes coverage window and on-call load using shifts.

V2 (/analytics-new)

- Uses calculateSLAMetrics for aggregated metrics and trends.
- Includes heatmap data (always last 365 days) and insights list.
- Several metrics are placeholders or null in calculateSLAMetrics (p50/p95, mtbf).
- No status age breakdown or on-call load per person exposed from metrics service.

Metrics coverage

Both legacy and V2

- MTTA, MTTR
- Ack rate, Resolve rate
- High urgency rate
- Alerts count
- Alerts per incident
- Unassigned active incidents
- After-hours rate
- Coverage percent
- On-call hours
- Escalation rate
- Status mix (counts)
- Incident volume trend

Legacy only

- Incidents in view vs total (active vs recent count split)
- Ack SLA met, Resolve SLA met (service target based)
- Top noisy services list
- Urgency mix pie chart (HIGH vs LOW)
- State age breakdown (avg time per status)
- Ownership and on-call load lists
- Top recurring incident titles
- Coverage outlook with gap days
- SLA compliance by service table (ack/resolve rates and breaches)
- Auto vs manual resolution breakdown
- SLA burn stats
- MTTA/MTTR percentiles (p50/p95)

V2 only

- Insights feed (derived from metrics service)
- Heatmap calendar (last 12 weeks)
- Service health matrix table (serviceMetrics)
- MTTA/MTTR trend line chart

Section mapping

Legacy sections

- Hero + export
- Metric card grid (16 items)
- Incident volume trend
- Status mix
- Top noisy services
- Urgency mix
- SLA gauges
- SLA summary table (p50/p95, SLA breaches, high urgency rate)
- Coverage outlook
- SLA compliance by service
- Auto vs manual resolution stats
- Ownership and on-call load
- Top recurring incident titles

V2 sections

- Header with actions (refresh, subscribe, export)
- KPI grid (core response health)
- Extended KPI grid (rates, operational, coverage)
- Insights + response trend line chart
- Incident volume trend
- Status mix
- Assignee load
- Service health matrix
- SLA gauges
- Heatmap calendar

Metrics service gaps vs legacy needs

Not exposed by calculateSLAMetrics

- Status age breakdown (avg duration per status)
- On-call load per person (incidents + hours)
- SLA compliance by service (ack/resolve rates per service)
- Auto vs manual resolution breakdown
- SLA burn stats
- p50/p95 metrics for MTTA/MTTR

Potential data discrepancies

- Legacy uses direct queries and ad-hoc calculations; V2 uses metrics service which may diverge for the same filters.
- Export API calculations are simplified and may not match legacy/V2 totals exactly.

Parity to close (short list)

- Align access policy across /analytics and /analytics-new.
- Pass all active filters to export from analytics-new.
- Backfill legacy-only sections/metrics into V2 or confirm they are intentionally removed.
- Decide whether mobile analytics needs a filter-aware summary or remains 7-day fixed.
