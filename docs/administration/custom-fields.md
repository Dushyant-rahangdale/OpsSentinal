---
order: 3
---

# Custom Fields

Add custom metadata to incidents for better organization, filtering, and reporting.

## What are Custom Fields?

Custom fields let you capture extra context such as:

- Environment (prod, staging, dev)
- Region (us-east, eu-west)
- Customer tier (enterprise, free)
- Affected component

## Creating Custom Fields

1. Go to **Settings → Custom Fields**
2. Click **+ Add Field**
3. Configure:

| Setting       | Description                |
| ------------- | -------------------------- |
| Name          | Field identifier           |
| Display Label | User-friendly name         |
| Type          | Text, Select, Multi-Select |
| Required      | Mandatory on incidents     |
| Default Value | Pre-filled value           |

> **Tip:** Use short, consistent keys like `environment` or `customer_tier`.

## Field Types

### Text

Free-form text input.

**Example:** `ticket_id`, `customer_id`

### Select (Dropdown)

Single selection from predefined options.

**Example:** Environment → [Production, Staging, Development]

### Multi-Select

Multiple selections allowed.

**Example:** Affected Regions → [US-East, US-West, EU-West]

## Using Custom Fields

### On Incidents

When creating or editing incidents:

1. Custom fields appear in the form
2. Fill in values
3. Save

### Filtering

Filter incidents by custom field values:

1. Go to **Incidents**
2. Click **Filters**
3. Select the custom field
4. Choose values

### In Reports

Custom fields appear in:

- Incident exports
- Analytics breakdowns
- Postmortem templates

## Example Setup

### Environment Field

| Setting  | Value                            |
| -------- | -------------------------------- |
| Name     | environment                      |
| Label    | Environment                      |
| Type     | Select                           |
| Options  | Production, Staging, Development |
| Required | Yes                              |
| Default  | Production                       |

### Customer Tier Field

| Setting  | Value                      |
| -------- | -------------------------- |
| Name     | customer_tier              |
| Label    | Customer Tier              |
| Type     | Select                     |
| Options  | Enterprise, Business, Free |
| Required | No                         |

## API Usage

Include custom fields in API requests:

```bash
curl -X POST /api/incidents \
  -d '{
    "title": "Database timeout",
    "serviceId": "...",
    "customFields": {
      "environment": "production",
      "customer_tier": "enterprise"
    }
  }'
```

## Best Practices

- Prefer dropdowns for consistent reporting.
- Keep required fields minimal to reduce friction.
- Document field meanings for teams.
- Review and clean up unused fields periodically.
