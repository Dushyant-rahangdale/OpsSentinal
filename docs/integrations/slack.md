---
order: 1
---

# Slack Integration

Send incident notifications to Slack channels.

## Features

- 🔔 Incident alerts to channels
- ✅ Acknowledge from Slack
- 🔧 Resolve from Slack
- 📊 Incident details in messages

## Setup

For detailed OAuth configuration and environment variables, see [Slack OAuth Setup](./slack-oauth-setup.md).

### Step 1: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Name: `OpsKnight`
5. Select your workspace

### Step 2: Configure OAuth

Add OAuth scopes:

**Bot Token Scopes:**

- `chat:write` - Send messages
- `channels:read` - List channels
- `groups:read` - List private channels

### Step 3: Install to Workspace

1. Go to **OAuth & Permissions**
2. Click **Install to Workspace**
3. Authorize the app
4. Copy the **Bot User OAuth Token**

### Step 4: Configure in OpsKnight

1. Go to **Settings → Integrations → Slack**
2. Click **Configure**
3. Enter:
   - Client ID
   - Client Secret
4. Click **Connect**

## Channel Configuration

### Global Default

Set a default channel for all incidents:

1. Go to **Integrations → Slack**
2. Select **Default Channel**

### Per-Service

Configure channels per service:

1. Open the service
2. Go to **Integrations**
3. Select Slack channel

## Notification Filters

Control which events notify:

| Event        | Description               |
| ------------ | ------------------------- |
| Triggered    | New incident              |
| Acknowledged | Someone is working on it  |
| Resolved     | Incident fixed            |
| Escalated    | Escalation step triggered |

## Message Format

Slack messages include:

- Incident title and severity
- Service name
- Trigger time
- Action buttons

### Interactive Buttons

- **Acknowledge** - Mark as acknowledged
- **View** - Open in OpsKnight

## Troubleshooting

### Messages not sending

1. Verify bot is in the channel
2. Check OAuth token is valid
3. Review channel permissions

### Button actions not working

1. Enable Interactive Components in Slack app
2. Set Request URL to your OpsKnight URL

## Best Practices

- ✅ Use dedicated incident channels
- ✅ Don't spam general channels
- ✅ Filter to relevant events
- ✅ Test with low-severity incidents
