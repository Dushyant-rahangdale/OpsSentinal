# Incident SLA domain contract

The incident row is the operational source of truth. New incidents resolve the newest sealed policy once, capture its targets and provenance, and never consult mutable configuration again.

Precedence for new incidents is: service priority rule, service base, then workspace base. A service policy with `inheritWorkspace=true` inherits the workspace base but may still define service priority rules. Policy drafts are invisible; sealing publishes an immutable version.

Both phases breach only when elapsed time is strictly greater than the target. A resolved incident without acknowledgement is an ACK breach. Snooze and suppression stop the canonical materialized clock; reopening shifts future deadlines by the accumulated pause duration.

All operational consumers must use `projectIncidentSlaState()`, `getIncidentSlaCompliance()`, or `getIncidentSlaTransitions()`. Service fields and legacy priority constants exist only for migration/reporting compatibility and must not drive live incident SLA decisions.
