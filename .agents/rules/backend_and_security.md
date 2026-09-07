---
trigger: always_on
description: Backend architecture, Server Actions, RBAC authorization, and database safety
---

# Backend, Security & Database Invariants

1. **Server Actions & Mutations**:
   - Reside in dedicated `actions.ts` files with `'use server';`.
   - Never expose raw database operations directly to the client.
   - Always validate arguments with Zod schemas (`z.object({...})`).

2. **RBAC Capability Enforcement**:
   - Every Server Action mutating data or retrieving privileged records must check user capabilities:
     ```typescript
     const { getUserPermissions } = await import('@/lib/rbac');
     const permissions = await getUserPermissions();
     if (!permissions.capabilities.includes('incident.create.all')) {
       throw new Error('Unauthorized');
     }
     ```

3. **Multi-Tenant & Status Page Isolation**:
   - Never query or update resources across status page, team, or organization boundaries without checking resource ownership and permission scope.

4. **Input Sanitization & URL Safety**:
   - Sanitize all URLs using `sanitizeUrl()`, ensuring only safe protocols (`https:`, `http:`, `mailto:`, `tel:`) are accepted.
   - Escape dynamic content before embedding into HTML templates using `escapeHtml()`.

5. **Prisma Safety & Invariants**:
   - Wrap multi-entity updates (incident + events + notifications) in `prisma.$transaction([...])`.
   - Honor deduplication keys (`dedupKey`) to prevent alert storms and duplicate incidents.
   - Freeze immutable SLA targets (`slaAckTargetMs`, `slaResolveTargetMs`, `slaTargetSource`) upon incident creation.
