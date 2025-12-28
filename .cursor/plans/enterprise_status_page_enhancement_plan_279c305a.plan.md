---
name: Enterprise Status Page Enhancement Plan
overview: Comprehensive enhancement plan to transform the status page into an enterprise-grade solution with improved UI, advanced features, privacy controls, and better user experience for both administrators and end users.
todos:
  - id: settings-ui-refactor
    content: Refactor StatusPageConfig.tsx with sidebar navigation, better organization, and live preview panel
    status: completed
  - id: setup-wizard
    content: Create StatusPageSetupWizard component for guided first-time setup
    status: completed
  - id: privacy-schema
    content: Add privacy control fields to StatusPage model in Prisma schema
    status: completed
  - id: privacy-ui
    content: Create StatusPagePrivacySettings component with granular privacy controls
    status: completed
    dependencies:
      - privacy-schema
  - id: privacy-components
    content: Update status page components to respect privacy settings
    status: completed
    dependencies:
      - privacy-schema
  - id: subscription-schema
    content: Create StatusPageSubscription and StatusPageWebhook models
    status: completed
  - id: subscription-ui
    content: Create subscription form component and settings UI
    status: completed
    dependencies:
      - subscription-schema
  - id: email-templates
    content: Implement email templates for status notifications
    status: completed
    dependencies:
      - subscription-schema
  - id: public-ui-enhance
    content: Enhance public status page components with modern design and better UX
    status: completed
  - id: webhook-api
    content: Implement webhook system API endpoints and delivery logic
    status: completed
    dependencies:
      - subscription-schema
  - id: api-enhancements
    content: Enhance status API with new endpoints and features
    status: completed
  - id: performance-seo
    content: Implement performance optimizations and SEO enhancements
    status: completed
---

# E

nterprise Status Page Enhancement Plan

## Overview

Transform the status page into an enterprise-grade solution with improved settings UI, advanced features, enhanced privacy controls, and a polished public-facing experience. This plan addresses configuration usability, feature richness, privacy granularity, and visual design.

## Current State Analysis

**Existing Features:**

- Basic status page configuration (name, domain, branding)
- Service display with uptime metrics
- Incident history and announcements
- Custom CSS support
- RSS and JSON API endpoints

**Areas for Improvement:**

- Settings UI is tab-based but can be overwhelming
- Limited privacy controls
- No subscription/notification system
- Missing advanced customization options
- Limited integration capabilities
- UI needs modern polish

## Architecture Overview

```javascript
Settings UI (Admin)          Public Status Page (End Users)
├── Setup Wizard             ├── Status Overview
├── Configuration Tabs       ├── Service Status
│   ├── Quick Start          ├── Incident History
│   ├── Appearance           ├── Announcements
│   ├── Services             ├── Metrics & Charts
│   ├── Privacy & Data       ├── Subscription
│   ├── Integrations         └── API Documentation
├── Privacy Controls         
├── Preview Pane             
└── Publishing Controls      

Database Schema Extensions
├── StatusPageSettings (new privacy fields)
├── StatusPageSubscription (email notifications)
├── StatusPageWebhook (external integrations)
└── StatusPageTemplate (saved configurations)
```

## Implementation Plan

### Phase 1: Settings UI Redesign & Usability

**Goal:** Make configuration intuitive, organized, and easy to navigate.

#### 1.1 Setup Wizard for First-Time Users

**File:** `src/components/status-page/StatusPageSetupWizard.tsx`Create a guided wizard for initial setup:

- Step 1: Basic Information (name, domain, enabled)
- Step 2: Branding (logo, colors - with preview)
- Step 3: Services Selection
- Step 4: Privacy Settings
- Step 5: Review & Publish

**Key Features:**

- Progress indicator
- Skip option for advanced users
- Real-time preview
- Save as draft functionality

#### 1.2 Reorganized Settings Layout

**File:** `src/components/StatusPageConfig.tsx` (refactor)**New Structure:**

```javascript
Settings Navigation (Left Sidebar)
├── Quick Start (new)
│   ├── Setup Wizard
│   ├── Quick Actions
│   └── Status Overview
├── General
│   ├── Basic Settings
│   ├── Domain & SEO
│   └── Contact Information
├── Appearance
│   ├── Branding
│   ├── Colors & Theme
│   ├── Layout Options
│   └── Preview (live preview panel)
├── Services & Groups
│   ├── Service Selection
│   ├── Grouping & Organization
│   └── Display Settings
├── Privacy & Data Control (NEW)
│   ├── Data Visibility Rules
│   ├── Incident Privacy Settings
│   ├── Service Information Display
│   └── Metrics Privacy
├── Content
│   ├── Announcements
│   ├── Footer Content
│   └── Custom Pages (future)
├── Notifications & Subscriptions (NEW)
│   ├── Email Templates
│   ├── Subscription Settings
│   └── Notification Rules
├── Integrations (NEW)
│   ├── Webhooks
│   ├── API Access
│   └── Third-party Integrations
├── Customization
│   ├── Custom CSS
│   └── Advanced Styling
└── Advanced
    ├── Performance Settings
    ├── Cache Configuration
    └── API Settings
```

**UI Improvements:**

- Left sidebar navigation instead of tabs
- Breadcrumb navigation
- Search within settings
- Save indicator (draft/unsaved changes)
- Undo/redo functionality
- Keyboard shortcuts

#### 1.3 Live Preview Panel

**File:** `src/components/status-page/StatusPageLivePreview.tsx`Enhanced preview with:

- Split view (settings + preview)
- Device preview modes (desktop, tablet, mobile)
- Preview URL generation
- Screenshot export
- Share preview link

### Phase 2: Privacy & Data Control System

**Goal:** Enterprise-grade privacy controls for data visibility.

#### 2.1 Database Schema Extensions

**File:** `prisma/schema.prisma`Add to `StatusPage` model:

```prisma
model StatusPage {
  // ... existing fields
  
  // Privacy settings
  privacyMode            String?  @default("PUBLIC") // PUBLIC, RESTRICTED, PRIVATE
  showIncidentDetails    Boolean  @default(true)
  showIncidentTitles     Boolean  @default(true)
  showIncidentDescriptions Boolean @default(true)
  showAffectedServices   Boolean  @default(true)
  showIncidentTimestamps Boolean  @default(true)
  showServiceMetrics     Boolean  @default(true)
  showServiceDescriptions Boolean @default(true)
  showTeamInformation    Boolean  @default(false)
  showCustomFields       Boolean  @default(false)
  showIncidentAssignees  Boolean  @default(false)
  showIncidentUrgency    Boolean  @default(true)
  showUptimeHistory      Boolean  @default(true)
  showRecentIncidents    Boolean  @default(true)
  maxIncidentsToShow     Int      @default(50)
  incidentHistoryDays    Int      @default(90)
  allowedCustomFields    Json?    // Array of custom field IDs to show
  dataRetentionDays      Int?     // Auto-hide incidents older than X days
  requireAuth            Boolean  @default(false) // Require authentication
  authProvider           String?  // SSO provider if requireAuth=true
}
```

#### 2.2 Privacy Configuration UI

**File:** `src/components/status-page/StatusPagePrivacySettings.tsx`**Features:**

- Visual privacy matrix (what data is visible)
- Granular toggles for each data type
- Preview of how privacy settings affect display
- Privacy level presets:
- Public (show everything)
- Restricted (hide sensitive details)
- Private (minimal information)
- Custom (manual configuration)

**Privacy Controls:**

- Incident visibility rules
- Service information filters
- Metrics display options
- Timeline/history visibility
- Custom field visibility selector

#### 2.3 Privacy-Aware Components

Update existing components to respect privacy settings:

- `StatusPageIncidents.tsx` - Filter incident details
- `StatusPageServices.tsx` - Hide/show service information
- `StatusPageMetrics.tsx` - Conditional metric display
- `StatusPageHeader.tsx` - Adjust header information

### Phase 3: Subscription & Notification System

**Goal:** Allow end users to subscribe to status updates.

#### 3.1 Database Schema

**File:** `prisma/schema.prisma`

```prisma
model StatusPageSubscription {
  id              String   @id @default(cuid())
  statusPageId    String
  email           String
  phone           String?  // For SMS (future)
  token           String   @unique // Unsubscribe token
  subscribedAt    DateTime @default(now())
  unsubscribedAt  DateTime?
  verified        Boolean  @default(false)
  verificationToken String?
  preferences     Json?    // Notification preferences
  
  statusPage      StatusPage @relation(fields: [statusPageId], references: [id], onDelete: Cascade)
  
  @@unique([statusPageId, email])
  @@index([statusPageId, verified])
}

model StatusPageWebhook {
  id              String   @id @default(cuid())
  statusPageId    String
  url             String
  secret          String   // Webhook secret for verification
  events          Json     // Array of events to send
  enabled         Boolean  @default(true)
  lastTriggeredAt DateTime?
  createdAt       DateTime @default(now())
  
  statusPage      StatusPage @relation(fields: [statusPageId], references: [id], onDelete: Cascade)
  
  @@index([statusPageId, enabled])
}
```

#### 3.2 Subscription UI Components

**Public Page:** `src/components/status-page/StatusPageSubscribe.tsx`

- Email subscription form
- Notification preferences (all incidents, major incidents only, etc.)
- Verification email flow
- Unsubscribe page

**Settings:** `src/components/status-page/StatusPageSubscriptionsSettings.tsx`

- View subscribers list
- Email template configuration
- Notification rules
- Subscription analytics

#### 3.3 Email Templates

**File:** `src/lib/status-page-email-templates.ts`Templates for:

- Incident created
- Incident updated
- Incident resolved
- Maintenance scheduled
- Status change notifications

### Phase 4: Enhanced Public Status Page UI

**Goal:** Modern, polished, and feature-rich public experience.

#### 4.1 Status Page Components Enhancement

**Files:**

- `src/components/status-page/StatusPageHeader.tsx` (enhance)
- `src/components/status-page/StatusPageServices.tsx` (enhance)
- `src/components/status-page/StatusPageIncidents.tsx` (enhance)
- `src/components/status-page/StatusPageMetrics.tsx` (enhance)

**Improvements:**

- Modern card-based layouts
- Better mobile responsiveness
- Skeleton loading states
- Smooth animations and transitions
- Dark mode support
- Accessibility improvements (ARIA labels, keyboard navigation)

#### 4.2 New Public Components

**File:** `src/components/status-page/StatusPageSubscribe.tsx`

- Prominent subscription CTA
- Inline subscription form
- Success/error states

**File:** `src/components/status-page/StatusPageTimeline.tsx`

- Interactive timeline view
- Filter by service, date range
- Export timeline data

**File:** `src/components/status-page/StatusPageStatusHistory.tsx`

- Historical status chart
- Service status over time visualization
- Exportable reports

**File:** `src/components/status-page/StatusPageServiceGroups.tsx`

- Group services by category
- Collapsible groups
- Group-level status indicators

#### 4.3 Status Page Layout Options

Add new layout presets:

- **Classic:** Traditional list view
- **Grid:** Card-based grid layout
- **Timeline:** Chronological focus
- **Dashboard:** Metrics-first view
- **Minimal:** Clean, minimal design

### Phase 5: Integrations & API Enhancements

**Goal:** Extend integration capabilities.

#### 5.1 Webhook System

**API:** `src/app/api/status-page/webhooks/route.ts`Webhook events:

- `incident.created`
- `incident.updated`
- `incident.resolved`
- `status.changed`
- `maintenance.scheduled`

Features:

- Webhook retry logic
- Webhook delivery logs
- Secret verification
- Custom headers support

#### 5.2 Enhanced API

**File:** `src/app/api/status/route.ts` (enhance)New endpoints:

- `/api/status/subscribe` - Subscribe to updates
- `/api/status/unsubscribe` - Unsubscribe
- `/api/status/history` - Historical data
- `/api/status/metrics` - Detailed metrics
- `/api/status/services/{id}` - Service-specific status

API features:

- API versioning
- Rate limiting
- API keys authentication (optional)
- Response caching
- GraphQL endpoint (future consideration)

#### 5.3 RSS Feed Enhancement

**File:** `src/app/api/status/rss/route.ts` (enhance)

- Filter by service
- Filter by incident type
- Custom feed URLs
- Atom feed format option

### Phase 6: Advanced Features

#### 6.1 Status Page Templates

**Database:** Add `StatusPageTemplate` modelPre-built templates:

- SaaS Company
- E-commerce
- Financial Services
- Healthcare
- Government

Features:

- One-click template application
- Template marketplace (future)
- Custom template saving

#### 6.2 Multi-Language Support

- i18n for status page text
- Language selector
- Translated incident templates
- Timezone-aware timestamps

#### 6.3 Custom Pages

**Database:** Add `StatusPageCustomPage` model

- Additional pages (About, SLA, etc.)
- Custom URL routing
- Rich content editor
- Navigation integration

#### 6.4 Analytics & Insights

- Page view analytics
- Popular services tracking
- Subscription conversion metrics
- Incident impact analytics
- User behavior insights

### Phase 7: Performance & SEO

#### 7.1 Performance Optimizations

- Static generation for public page
- Incremental Static Regeneration (ISR)
- Image optimization
- CSS/JS code splitting
- CDN integration

#### 7.2 SEO Enhancements

- Structured data (JSON-LD)
- Meta tags optimization
- Sitemap generation
- robots.txt configuration
- Open Graph tags
- Twitter Card support

## File Structure

```javascript
src/
├── app/
│   ├── (app)/settings/status-page/
│   │   ├── page.tsx (refactor)
│   │   └── components/ (new)
│   │       ├── QuickStartTab.tsx
│   │       ├── PrivacySettingsTab.tsx
│   │       ├── SubscriptionsTab.tsx
│   │       └── IntegrationsTab.tsx
│   ├── (public)/status/
│   │   ├── page.tsx (enhance)
│   │   ├── subscribe/page.tsx (new)
│   │   └── unsubscribe/[token]/page.tsx (new)
│   └── api/
│       ├── status-page/
│       │   ├── subscribe/route.ts (new)
│       │   ├── webhooks/route.ts (new)
│       │   └── templates/route.ts (new)
│       └── status/
│           ├── route.ts (enhance)
│           ├── rss/route.ts (enhance)
│           └── history/route.ts (new)
├── components/
│   ├── status-page/
│   │   ├── StatusPageConfig.tsx (major refactor)
│   │   ├── StatusPageSetupWizard.tsx (new)
│   │   ├── StatusPagePrivacySettings.tsx (new)
│   │   ├── StatusPageSubscribe.tsx (new)
│   │   ├── StatusPageLivePreview.tsx (new)
│   │   ├── StatusPageTimeline.tsx (new)
│   │   └── [existing components - enhance]
│   └── ui/
│       ├── SettingsSidebar.tsx (new)
│       └── PrivacyMatrix.tsx (new)
└── lib/
    ├── status-page-email-templates.ts (new)
    ├── status-page-webhooks.ts (new)
    └── status-page-privacy.ts (new)
```

## Database Migrations

1. Add privacy fields to StatusPage
2. Create StatusPageSubscription table
3. Create StatusPageWebhook table
4. Create StatusPageTemplate table (future)
5. Create StatusPageCustomPage table (future)

## Implementation Priority

**Phase 1 (Critical):** Settings UI Redesign

- Makes configuration accessible
- Foundation for all other features

**Phase 2 (High Priority):** Privacy & Data Control

- Enterprise requirement
- Competitive differentiator

**Phase 3 (High Priority):** Subscription System

- User engagement
- Communication channel

**Phase 4 (Medium Priority):** Public UI Enhancements

- User experience
- Brand representation

**Phase 5 (Medium Priority):** Integrations

- Ecosystem compatibility
- Automation support

**Phase 6 (Low Priority):** Advanced Features

- Nice-to-have enhancements
- Future expansion

**Phase 7 (Ongoing):** Performance & SEO

- Continuous improvement
- Best practices

## Success Metrics

- **Usability:** Time to configure status page < 5 minutes
- **Privacy:** 100% data visibility control
- **Engagement:** Subscription rate > 10% of visitors
- **Performance:** Page load time < 2 seconds
- **SEO:** Lighthouse score > 90

## Considerations

- Backward compatibility with existing configurations
- Migration path for existing status pages
- Testing strategy for privacy controls
- Email service integration (Resend/SendGrid)
- Rate limiting for webhooks and API