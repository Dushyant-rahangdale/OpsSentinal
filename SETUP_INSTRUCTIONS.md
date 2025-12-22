# Setup Instructions for New Features

## 🚀 Quick Start

### 1. Install New Dependencies

For background job processing (when ready):
```bash
npm install bullmq ioredis
```

### 2. Set Up Redis (for Background Jobs)

**Option A: Docker (Local Development)**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option B: Redis Cloud**
- Sign up at https://redis.com/try-free/
- Get connection string
- Add to `.env`:
```
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**Option C: AWS ElastiCache / Other Cloud**
- Follow provider's setup instructions
- Add connection details to `.env`

### 3. Environment Variables

Add to `.env.local`:
```env
# Redis (for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cron Secret (for securing cron endpoints)
CRON_SECRET=your-secret-key-here

# Notification Providers (when implementing)
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
```

### 4. Enable Background Jobs

Once Redis is set up:

1. Uncomment code in `src/lib/jobs/queue.ts`
2. Update `src/lib/escalation.ts` to use job queue:
```typescript
import { scheduleEscalation } from '@/lib/jobs/queue';

// Replace direct execution with:
await scheduleEscalation(incidentId, stepIndex, delayMs);
```

3. Update `src/lib/notifications.ts` to use job queue:
```typescript
import { scheduleNotification } from '@/lib/jobs/queue';

// Replace direct sending with:
await scheduleNotification(incidentId, userId, channel, message);
```

### 5. Verify Cron Job

The cron job is already configured in `vercel.json`:
- Runs every 5 minutes
- Endpoint: `/api/cron/process-escalations`

For local testing:
```bash
# Test the endpoint
curl http://localhost:3000/api/cron/process-escalations
```

### 6. Using New UI Components

Import and use:
```typescript
import { 
  Button, 
  Card, 
  Modal, 
  Select, 
  FormField,
  Checkbox,
  Badge,
  Skeleton,
  Spinner,
  ErrorBoundary,
  ErrorState
} from '@/components/ui';
```

Examples:
```tsx
// Button
<Button variant="primary" size="md" isLoading={loading}>
  Submit
</Button>

// Modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={<Button onClick={handleConfirm}>Confirm</Button>}
>
  Are you sure?
</Modal>

// Form
<FormField
  type="input"
  label="Email"
  inputType="email"
  required
  error={errors.email}
/>

// Loading
<LoadingWrapper isLoading={loading} skeleton="card">
  <YourContent />
</LoadingWrapper>
```

---

## 📋 Component Usage Checklist

- [ ] Replace inline button styles with `<Button>`
- [ ] Replace div containers with `<Card>`
- [ ] Add `<ErrorBoundary>` to route components
- [ ] Add skeleton loaders to Suspense fallbacks
- [ ] Use `<FormField>` for all form inputs
- [ ] Use `<Modal>` for dialogs
- [ ] Use `<Select>` for dropdowns
- [ ] Add loading states with `<Spinner>` or `<Skeleton>`

---

## 🔧 Next Steps

1. **Set up Redis** (if using background jobs)
2. **Install BullMQ** (if using background jobs)
3. **Test cron endpoint** locally
4. **Start using new components** in existing code
5. **Add more skeleton loaders** to other pages
6. **Implement notification providers** (SMS/Push)

---

**Last Updated:** December 2024

