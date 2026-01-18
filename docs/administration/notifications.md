---
order: 2
---

# Notifications

Configure how OpsKnight alerts users about incidents and status changes.

## Notification Channels

| Channel  | Use Case            |
| -------- | ------------------- |
| Email    | All users           |
| SMS      | Critical alerts     |
| Push     | Mobile PWA users    |
| WhatsApp | International teams |
| Slack    | Team notifications  |

## Where to Configure

Go to **Settings → Notifications** to add providers and test delivery.

---

## Email (SMTP)

### Configuration

| Field        | Example             |
| ------------ | ------------------- |
| SMTP Host    | smtp.gmail.com      |
| SMTP Port    | 587                 |
| Username     | alerts@company.com  |
| Password     | •••••••••           |
| From Address | noreply@company.com |

### Providers

- Gmail / Google Workspace
- Microsoft 365
- SendGrid
- Amazon SES
- Resend

---

## SMS (Twilio)

### Configuration

| Field        | Description                 |
| ------------ | --------------------------- |
| Account SID  | Twilio account identifier   |
| Auth Token   | Twilio auth token           |
| Phone Number | Twilio phone number (+1...) |

### Setup Steps

1. Create a Twilio account.
2. Get the Account SID and Auth Token.
3. Purchase a phone number.
4. Enter credentials in **Settings → Notifications**.

### User Phone Numbers

Users must add their phone number:

1. Go to **Profile**
2. Add **Phone Number**
3. Verify via SMS code

---

## Push Notifications (Firebase / OneSignal)

### Firebase Cloud Messaging

| Field      | Description    |
| ---------- | -------------- |
| Server Key | FCM server key |
| Sender ID  | FCM sender ID  |

### OneSignal

| Field        | Description       |
| ------------ | ----------------- |
| App ID       | OneSignal App ID  |
| REST API Key | OneSignal API key |

### User Enablement

Users enable push via the PWA:

1. Open the app in a browser
2. Accept notification permission
3. Push is enabled automatically

---

## WhatsApp (Twilio)

Use the same Twilio credentials as SMS, plus a WhatsApp-enabled number:

1. Enable WhatsApp in Twilio console
2. Connect WhatsApp Business
3. Use the WhatsApp number in Settings

---

## AWS SNS (SMS)

For high-volume SMS:

| Field             | Description            |
| ----------------- | ---------------------- |
| Region            | AWS region (us-east-1) |
| Access Key ID     | AWS access key         |
| Secret Access Key | AWS secret key         |

---

## Preferences and Routing

### User Level

Each user configures their preferences:

- Channels to use
- Quiet hours
- Digest frequency

### Service Level

Per-service notification settings:

- Notify on trigger
- Notify on acknowledge
- Notify on resolve
- Notify on SLA breach

## Testing Notifications

1. Go to **Settings → Notifications**
2. Click **Send Test**
3. Verify receipt

## Best Practices

- Use multiple channels for critical services.
- Use SMS for high-severity incidents only.
- Test providers after changes.
- Respect quiet hours to avoid alert fatigue.
