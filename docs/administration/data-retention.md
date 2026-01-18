---
order: 5
---

# Data Retention

Manage data storage and automatic cleanup policies.

## Overview

Retention policies help:

- Reduce storage costs
- Improve query performance
- Meet compliance requirements

## Configure Retention

1. Go to **Settings → System → Data Retention**
2. Set retention periods
3. Save changes

## Retention Settings

| Data Type            | Default  | Recommended |
| -------------------- | -------- | ----------- |
| Resolved Incidents   | 90 days  | 90-365 days |
| Event Logs           | 30 days  | 30-90 days  |
| Notification History | 30 days  | 30-60 days  |
| Audit Logs           | 365 days | 365+ days   |

## How Cleanup Works

The cleanup job runs automatically:

- **Frequency**: Daily (via internal cron)
- **Time**: Off-peak hours
- **Method**: Soft delete, then purge

### Cleanup Process

1. Identify data older than retention period
2. Mark for deletion
3. Delete in batches
4. Log cleanup results

## Manual Cleanup

Force immediate cleanup:

```bash
# Via API (Admin only)
curl -X POST https://your-ops.com/api/settings/retention/cleanup \
  -H "Authorization: Bearer ADMIN_API_KEY" \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

## Data Export

Before data is deleted, export if needed:

1. Go to **Analytics**
2. Filter by date range
3. Click **Export**
4. Download CSV/JSON

## Compliance Notes

- Audit logs have extended retention.
- Export data before deletion if required for audits.
- Use a longer retention policy for regulated workloads.

## Best Practices

- Set retention based on regulatory needs.
- Review retention quarterly.
- Export critical datasets before expiry.
- Monitor storage growth.
