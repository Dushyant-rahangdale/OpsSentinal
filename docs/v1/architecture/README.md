---
order: 8
title: Architecture
description: How OpsKnight is built in code today
---

# System Architecture

## Overview

OpsKnight is a Next.js App Router application that combines server-rendered UI, API routes, and
background processing on top of a single PostgreSQL database. The product is split into three
primary runtime surfaces:

- **Web App**: `src/app/(app)` and shared UI/components
- **Mobile Web/PWA**: `src/app/(mobile)/m` (PWA support is wired via `next-pwa`, but SW caching is
  disabled by default in `next.config.ts`)
- **Public Status Page**: `src/app/status` + `src/app/api/status-page/*`

The backend logic lives in `src/lib` and is invoked by server components, API routes, and the
internal cron scheduler.

---

## High-Level Flow

```
Clients
  ├─ Web App (App Router)
  ├─ Mobile Web/PWA
  ├─ Status Page
  └─ API Clients / Integrations
           │
           ▼
Next.js Application (App Router)
  ├─ UI (server + client components)
  ├─ API routes (/api/*)
  ├─ Server actions
  └─ Internal cron scheduler (src/lib/cron-scheduler.ts)
           │
           ▼
PostgreSQL (Prisma)
  ├─ Users / Teams / Services
  ├─ Incidents / Alerts / Events
  ├─ On-call & Escalations
  ├─ Notifications & Providers
  ├─ Status Page config
  ├─ SLA & Analytics rollups
  └─ Background jobs (queue + scheduler state)
           │
           ▼
Outbound Channels
  ├─ Email (Resend / SendGrid / SMTP / SES)
  ├─ SMS + WhatsApp (Twilio or AWS SNS)
  ├─ Web Push (PWA)
  ├─ Slack
  └─ Webhooks
```

---

## Technology Stack (from `OpsKnight/package.json`)

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Web framework    | Next.js 16.x (App Router)                    |
| UI               | React 19, Tailwind CSS, Radix UI             |
| Auth             | NextAuth (Credentials + optional OIDC)       |
| DB/ORM           | PostgreSQL + Prisma                          |
| Charts           | Recharts                                     |
| Forms/Validation | React Hook Form + Zod                        |
| PWA              | `@ducanh2912/next-pwa` (disabled by default) |

---

## Core Subsystems (code-driven)

### Incident Intake & Deduplication

- **Events API**: `src/app/api/events/route.ts`
- **Processor**: `src/lib/events.ts`
- **Behavior**: writes `Alert`, deduplicates by `dedupKey`, creates/updates `Incident`, logs
  `IncidentEvent`, and triggers follow-up actions.

### Integrations

- **Inbound webhooks**: `src/app/api/integrations/*`
- **Normalization**: `src/lib/integrations/*` + `src/lib/integrations/handler.ts`

### Escalations & On-call

- **Engine**: `src/lib/escalation.ts`, `src/lib/oncall.ts`
- **Persistence**: `Incident.nextEscalationAt`, `EscalationPolicy`, `OnCallSchedule`
- **Queueing**: `src/lib/jobs/queue.ts` (Postgres-backed jobs)

### Notifications

- **Core**: `src/lib/notifications.ts`, `src/lib/notification-providers.ts`
- **Channels**: `src/lib/email.ts`, `src/lib/sms.ts`, `src/lib/whatsapp.ts`, `src/lib/push.ts`,
  `src/lib/slack.ts`, `src/lib/status-page-notifications.ts`

### Analytics & SLA

- **Metrics engine**: `src/lib/sla-server.ts`, `src/lib/analytics-metrics.ts`
- **Rollups**: `src/lib/metric-rollup.ts`, `IncidentMetricRollup` model
- **Retention**: `src/lib/retention-policy.ts`, `SystemSettings` model
- **Breach checks**: `src/lib/sla-breach-monitor.ts`

### Status Page

- **UI**: `src/app/status/*`
- **API**: `src/app/api/status-page/*` and related helpers in `src/lib/status-page-*`

---

## Data Model Highlights (Prisma)

Key tables that define the current system:

- **Core**: `User`, `Team`, `Service`, `Incident`, `Alert`, `IncidentEvent`, `IncidentNote`
- **Escalation & On-call**: `EscalationPolicy`, `EscalationRule`, `OnCallSchedule`, `OnCallShift`
- **Notifications**: `Notification`, `NotificationProvider`, `InAppNotification`
- **Jobs & Scheduler**: `BackgroundJob`, `CronSchedulerState`
- **Analytics/SLA**: `IncidentMetricRollup`, `SLADefinition`, `SLASnapshot`, `SLAPerformanceLog`
- **Status Page**: `StatusPage`, `StatusPageService`, `StatusPageAnnouncement`, `StatusPageWebhook`

---

## Background Jobs & Internal Scheduler

OpsKnight runs background work inside the Next.js runtime (non-edge) using:

- **Scheduler**: `src/lib/cron-scheduler.ts` (DB-backed lock via `CronSchedulerState`)
- **Queue**: `src/lib/jobs/queue.ts` + `BackgroundJob` model
- **Job types**: `ESCALATION`, `NOTIFICATION`, `AUTO_UNSNOOZE`, `SCHEDULED_TASK`

The scheduler also handles periodic maintenance such as SLA breach checks, retrying failed
notifications, and token cleanup.

---

## Real-Time Streams (SSE)

Server-Sent Events endpoints used by the UI:

- `/api/realtime/stream` (dashboard)
- `/api/events/stream`
- `/api/notifications/stream`
- `/api/widgets/stream`
- `/api/sla/stream` (batched SLA data)

---

## Where To Look

- **App routes**: `src/app/(app)` and `src/app/(mobile)`
- **API routes**: `src/app/api`
- **Business logic**: `src/lib`
- **UI components**: `src/components`
- **Database schema**: `prisma/schema.prisma`
