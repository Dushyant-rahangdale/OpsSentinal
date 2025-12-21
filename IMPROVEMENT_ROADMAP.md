# OpsGuard Improvement Roadmap

## 🔴 Critical Priority (Core Functionality)

### 1. **Background Job System for Escalation Processing**
**Current State:** `processPendingEscalations()` is a placeholder - delayed escalations don't execute automatically.

**Action Items:**
- Implement a background job system (e.g., Bull/BullMQ, Agenda, or Vercel Cron)
- Create API route `/api/cron/process-escalations` for scheduled execution
- Store escalation schedule times in database (add `nextEscalationAt` to Incident model)
- Process pending escalations every 1-5 minutes
- Handle timezone-aware scheduling

**Files to Modify:**
- `prisma/schema.prisma` - Add `nextEscalationAt` and `currentEscalationStep` fields
- `src/lib/escalation.ts` - Implement actual scheduling logic
- `src/app/api/cron/process-escalations/route.ts` - New cron endpoint
- `src/lib/events.ts` - Trigger escalation on incident creation

**Priority:** 🔴 Critical

---

### 2. **Escalation Policy: Teams & Schedules Support**
**Current State:** Only supports User targets. Code structure exists for Teams/Schedules but not implemented.

**Action Items:**
- Update `EscalationRule` schema to support `targetType` enum (USER, TEAM, SCHEDULE)
- Make `targetUserId` optional, add `targetTeamId` and `targetScheduleId`
- Update `PolicyStepCreateForm` to allow selecting team/schedule
- Enhance `resolveEscalationTarget()` to handle all three types
- Update policy detail page to show target type clearly

**Files to Modify:**
- `prisma/schema.prisma` - Add target type fields
- `src/components/PolicyStepCreateForm.tsx` - Add target type selector
- `src/lib/escalation.ts` - Implement team/schedule resolution
- `src/app/(app)/policies/[id]/page.tsx` - Display target types

**Priority:** 🔴 Critical

---

### 3. **Real Email/SMS/Push Notification Integration**
**Current State:** Notifications are mocked (90% success rate, no real sending).

**Action Items:**
- Integrate email service (SendGrid, Resend, AWS SES)
- Integrate SMS service (Twilio, AWS SNS)
- Integrate push notifications (OneSignal, Firebase Cloud Messaging)
- Add notification provider configuration in settings
- Store provider credentials securely (environment variables)
- Implement retry logic for failed notifications
- Add notification delivery status tracking

**Files to Modify:**
- `src/lib/notifications.ts` - Replace mock with real implementations
- `src/app/(app)/settings/notifications/page.tsx` - New settings page
- `.env.example` - Add provider configuration

**Priority:** 🔴 Critical

---

## 🟠 High Priority (Enhanced Features)

### 4. **Incident Metrics & SLAs**
**Current State:** Basic dashboard exists, but no SLA tracking or detailed metrics.

**Action Items:**
- Track MTTR (Mean Time To Resolve)
- Track MTTD (Mean Time To Detect)
- Track MTTI (Mean Time To Investigate)
- Track MTTK (Mean Time To Know)
- Calculate SLA compliance per service (targetAckMinutes, targetResolveMinutes)
- Add SLA breach notifications
- Display metrics in Analytics page
- Add SLA dashboard widget

**Files to Modify:**
- `prisma/schema.prisma` - Add SLA tracking fields (acknowledgedAt, resolvedAt)
- `src/app/(app)/incidents/actions.ts` - Track timestamps on status changes
- `src/app/(app)/analytics/page.tsx` - Add SLA metrics
- `src/components/analytics/MetricCard.tsx` - Add new metric cards

**Priority:** 🟠 High

---

### 5. **Real-time Incident Updates**
**Current State:** Page refreshes required to see updates.

**Action Items:**
- Implement Server-Sent Events (SSE) or WebSocket connection
- Broadcast incident status changes to all connected clients
- Update dashboard/incident list in real-time
- Add "someone is viewing this incident" indicator
- Real-time collaboration features (live cursors, etc.)

**Files to Modify:**
- `src/app/api/incidents/[id]/stream/route.ts` - New SSE endpoint
- `src/components/IncidentTable.tsx` - Add real-time updates
- `src/app/(app)/incidents/[id]/page.tsx` - Add real-time updates

**Priority:** 🟠 High

---

### 6. **Advanced Search & Filtering**
**Current State:** Basic search exists, limited filtering.

**Action Items:**
- Full-text search across incidents (PostgreSQL full-text search)
- Advanced filters (date range, multiple services, urgency combinations)
- Saved filter presets
- Export filtered results to CSV/JSON
- Search within incident notes and events
- Search autocomplete suggestions

**Files to Modify:**
- `src/app/api/search/route.ts` - Enhance search logic
- `src/components/SidebarSearch.tsx` - Add advanced search UI
- `src/app/(app)/incidents/page.tsx` - Add filter presets

**Priority:** 🟠 High

---

### 7. **Incident Templates**
**Current State:** No templates for common incidents.

**Action Items:**
- Create incident template model (name, title, description, default urgency, service)
- Template library page
- "Create from template" option
- Pre-filled form with template data
- Allow users to save custom templates

**Files to Modify:**
- `prisma/schema.prisma` - Add `IncidentTemplate` model
- `src/app/(app)/templates/page.tsx` - New templates page
- `src/app/(app)/incidents/create/page.tsx` - Add template selector

**Priority:** 🟠 High

---

### 8. **Webhook Integration (Outbound)**
**Current State:** Inbound webhooks exist, no outbound webhooks.

**Action Items:**
- Create webhook endpoint model (URL, events to subscribe to, secret)
- Webhook configuration page
- Send webhook payloads on incident events (create, update, resolve)
- Retry logic for failed webhooks
- Webhook delivery logs
- Webhook signature verification

**Files to Modify:**
- `prisma/schema.prisma` - Add `Webhook` model
- `src/app/(app)/webhooks/page.tsx` - New webhooks page
- `src/lib/webhooks.ts` - Webhook sending logic
- `src/app/(app)/incidents/actions.ts` - Trigger webhooks

**Priority:** 🟠 High

---

## 🟡 Medium Priority (Nice-to-Have)

### 9. **User Notification Preferences**
**Current State:** User has `dailySummary` and `incidentDigest` fields but not fully utilized.

**Action Items:**
- User notification preferences page
- Channel preferences (email, SMS, push)
- Quiet hours configuration
- Notification frequency settings
- Incident urgency filtering (only notify for HIGH, etc.)
- Service-specific notification settings

**Files to Modify:**
- `src/app/(app)/settings/profile/page.tsx` - Add notification preferences
- `src/lib/notifications.ts` - Respect user preferences
- `prisma/schema.prisma` - Enhance User model with preferences

**Priority:** 🟡 Medium

---

### 10. **Incident Postmortems**
**Current State:** No postmortem system.

**Action Items:**
- Postmortem model (incident, summary, timeline, root cause, action items)
- Postmortem creation form
- Postmortem template
- Link postmortems to incidents
- Postmortem library/review page
- Export postmortems to PDF

**Files to Modify:**
- `prisma/schema.prisma` - Add `Postmortem` model
- `src/app/(app)/postmortems/page.tsx` - New postmortems page
- `src/app/(app)/incidents/[id]/page.tsx` - Link to postmortem

**Priority:** 🟡 Medium

---

### 11. **Bulk Operations on Incidents**
**Current State:** Can only update incidents one at a time.

**Action Items:**
- Multi-select checkboxes in incident table
- Bulk acknowledge/resolve
- Bulk reassignment
- Bulk urgency change
- Bulk status change
- Bulk delete (with confirmation)

**Files to Modify:**
- `src/components/IncidentTable.tsx` - Add checkbox column
- `src/app/(app)/incidents/actions.ts` - Add bulk action functions
- `src/app/(app)/incidents/page.tsx` - Add bulk action toolbar

**Priority:** 🟡 Medium

---

### 12. **Custom Fields on Incidents**
**Current State:** Fixed incident fields only.

**Action Items:**
- Custom field model (name, type, required, service-specific)
- Custom field configuration page
- Display custom fields in incident forms
- Store custom field values (JSON or separate table)
- Filter/search by custom fields

**Files to Modify:**
- `prisma/schema.prisma` - Add `CustomField` and `IncidentCustomField` models
- `src/app/(app)/settings/custom-fields/page.tsx` - New page
- `src/app/(app)/incidents/create/page.tsx` - Render custom fields

**Priority:** 🟡 Medium

---

### 13. **Status Page Integration**
**Current State:** No status page functionality.

**Action Items:**
- Public status page (service health, active incidents)
- Status page configuration (branding, custom domain)
- Automatic status updates based on incidents
- Status page API for external integrations
- Incident communication templates

**Files to Modify:**
- `src/app/(public)/status/page.tsx` - New public status page
- `prisma/schema.prisma` - Add `StatusPage` model
- `src/app/(app)/settings/status-page/page.tsx` - Configuration page

**Priority:** 🟡 Medium

---

### 14. **Enhanced Analytics Dashboard**
**Current State:** Basic analytics exist, can be expanded.

**Action Items:**
- Trend analysis (incidents over time)
- Service health heatmap
- On-call load analysis
- Response time distribution charts
- Top incident sources
- Team performance metrics
- Export analytics data

**Files to Modify:**
- `src/app/(app)/analytics/page.tsx` - Add more charts
- `src/components/analytics/` - Add new chart components
- `src/app/api/analytics/metrics/route.ts` - New metrics endpoint

**Priority:** 🟡 Medium

---

### 15. **Mobile Responsive Improvements**
**Current State:** Basic responsive design, but could be better.

**Action Items:**
- Mobile-optimized incident list (card view)
- Swipe actions on mobile
- Mobile-friendly forms
- Touch-optimized UI elements
- Mobile navigation menu
- Push notifications for mobile apps

**Files to Modify:**
- All component files - Improve responsive breakpoints
- `src/app/globals.css` - Mobile-specific styles

**Priority:** 🟡 Medium

---

## 🟢 Low Priority (Future Enhancements)

### 16. **Incident Recurrence Detection**
- Detect similar incidents (ML-based or rule-based)
- Group related incidents
- Alert on recurring patterns

### 17. **Runbook Integration**
- Link runbooks to services
- Display runbooks in incident detail
- Step-by-step execution tracking

### 18. **Incident Playbooks**
- Automated response playbooks
- Conditional workflows
- Integration with runbooks

### 19. **ChatOps Integration**
- Slack bot for incident management
- Incident commands in Slack
- Incident creation via Slack messages

### 20. **On-call Schedule Analytics**
- Schedule optimization suggestions
- Load balancing recommendations
- Coverage gap detection

---

## 📊 Priority Summary

| Priority | Count | Focus Area |
|----------|-------|------------|
| 🔴 Critical | 3 | Core functionality (escalation, notifications) |
| 🟠 High | 5 | Enhanced features (SLAs, real-time, search) |
| 🟡 Medium | 9 | Nice-to-have (postmortems, bulk ops, custom fields) |
| 🟢 Low | 5 | Future enhancements |

---

## 🚀 Quick Wins (Can Be Done in 1-2 Hours Each)

1. **Add `currentEscalationStep` tracking to Incident model** - Quick database migration
2. **Implement basic webhook retry logic** - Simple retry mechanism
3. **Add bulk action buttons** - UI-only change
4. **Create incident export to CSV** - Simple data export
5. **Add incident notes search** - Enhance existing search
6. **Create incident template from existing incident** - "Save as template" button

---

## 📝 Notes

- All improvements should maintain backward compatibility where possible
- Consider adding feature flags for gradual rollout
- Update API documentation when adding new endpoints
- Add comprehensive tests for critical features (escalation, notifications)
- Keep performance in mind (database indexes, query optimization)

---

## 🤝 Recommended Implementation Order

1. **Week 1-2:** Critical Priority items (#1, #2, #3)
2. **Week 3-4:** High Priority items (#4, #5, #6)
3. **Week 5-6:** High Priority items (#7, #8)
4. **Ongoing:** Medium and Low Priority items as needed

