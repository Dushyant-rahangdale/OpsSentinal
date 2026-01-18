---
order: 3
---

# First Steps

This walkthrough sets up a working incident flow end-to-end so you can validate OpsKnight quickly.

## 1) Create the Admin User

If you did not create an admin during install:

```bash
docker exec -it opsknight_app npm run opsknight -- \
  --user "Your Name" \
  --email admin@yourcompany.com \
  --password SecurePassword123! \
  --role admin
```

## 2) Log In

1. Open `http://localhost:3000`
2. Click **Sign In**
3. Enter your admin credentials

## 3) Create a Team

Teams map your on-call ownership and access policies.

1. Navigate to **Teams**
2. Click **+ New Team**
3. Add a team name and description
4. Save

## 4) Create Your First Service

Services represent systems you want to monitor.

1. Navigate to **Services**
2. Click **+ New Service**
3. Fill in:
   - **Name**: e.g., "API Gateway"
   - **Description**: Brief summary of what it does
   - **Owning Team**: Select the team you created
4. Click **Create**

## 5) Set an Escalation Policy

Escalation policies define who is notified and when.

1. Go to **Escalation Policies**
2. Click **+ New Policy**
3. Add steps (users or schedules)
4. Save

## 6) Create an On-Call Schedule

1. Go to **Schedules**
2. Click **+ New Schedule**
3. Add rotation rules and participants
4. Save and attach it to your escalation policy

## 7) Create an Integration Key

Integration keys allow external systems to trigger incidents.

1. Open your service
2. Go to the **Integrations** tab
3. Click **+ Add Integration**
4. Copy the **Routing Key**

## 8) Trigger a Test Incident

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "YOUR_ROUTING_KEY",
    "event_action": "trigger",
    "dedup_key": "test-incident-001",
    "payload": {
      "summary": "Test Incident",
      "source": "manual-test",
      "severity": "warning"
    }
  }'
```

## 9) Acknowledge and Resolve

1. Go to **Incidents**
2. Open the test incident
3. Click **Acknowledge**
4. Add a short note
5. Click **Resolve**

## 10) Configure Notifications

Add notification providers so your team is alerted.

- Email/SMS/Push: **Settings → Notifications**
- Slack: **Integrations → Slack**

---

## Next Steps

- [Configure notifications](../administration/notifications.md)
- [Connect Slack](../integrations/slack.md)
- [Set up services](../core-concepts/services.md)
- [Understand incidents](../core-concepts/incidents.md)
- [Explore escalation policies](../core-concepts/escalation-policies.md)
