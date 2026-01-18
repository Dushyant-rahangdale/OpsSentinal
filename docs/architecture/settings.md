---
order: 2
---

# Settings Component Architecture

This document describes the component architecture for the OpsKnight settings section.

## Overview

The settings section was refactored to improve maintainability and type safety by extracting notification provider configuration into focused, reusable components.

## Component Structure

```
src/components/settings/
├── NotificationProviderSettings.tsx   # Main settings orchestrator
├── SmsProviderSettings.tsx            # SMS config (Twilio/AWS SNS)
├── PushProviderSettings.tsx           # Push config (Firebase/OneSignal)
├── WhatsappProviderSettings.tsx       # WhatsApp Business API config
├── ProviderCard.tsx                   # System notification provider card
├── SystemNotificationSettings.tsx     # System admin notification settings
└── navConfig.ts                       # Navigation configuration
```

## Key Components

### NotificationProviderSettings

Main component that orchestrates SMS, Push, and WhatsApp provider configuration.

**Location:** `/settings/notifications`

**Uses:**

- `SmsProviderSettings`
- `PushProviderSettings`
- `WhatsappProviderSettings`

### SmsProviderSettings

Configures SMS notification providers.

**Providers:** Twilio, AWS SNS

**Props:**

```typescript
interface SmsProviderSettingsProps {
  enabled: boolean;
  provider: 'twilio' | 'aws-sns';
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  onEnabledChange: (enabled: boolean) => void;
  onProviderChange: (provider: SmsProvider) => void;
  // ... change handlers
  onTestSms: () => Promise<void>;
  isPending: boolean;
}
```

### PushProviderSettings

Configures push notification providers.

**Providers:** Firebase Cloud Messaging, OneSignal

### WhatsappProviderSettings

Configures WhatsApp Business API via Twilio.

### ProviderCard

Reusable card component for system notification provider configuration.

**Used by:** `SystemNotificationSettings`

## Type Definitions

All types are defined in `src/types/notification-types.ts`:

- `SmsProvider`, `PushProvider`, `EmailProvider` - Union types
- `SmsSettings`, `PushSettings`, `WhatsappSettings` - Settings interfaces
- `ProviderRecord`, `ProviderConfigSchema` - System provider types

## Testing

Unit tests are located in `tests/components/settings/`:

| Test File                         | Tests |
| --------------------------------- | ----- |
| SmsProviderSettings.test.tsx      | 10    |
| PushProviderSettings.test.tsx     | 8     |
| WhatsappProviderSettings.test.tsx | 6     |

Run tests with:

```bash
npm run test:run -- tests/components/settings
```

## Adding New Providers

1. Add provider type to `notification-types.ts`
2. Add configuration fields to component
3. Update build helper function
4. Add to providerConfigs in SystemNotificationSettings
5. Write tests
