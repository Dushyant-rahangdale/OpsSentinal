# RBAC Implementation Summary

## Overview

The application implements Role-Based Access Control (RBAC) where:
- **Responders and Admins**: Full access (can create, edit, delete)
- **Regular Users (USER role)**: Read-only access (can view but cannot modify)

## Permission Structure

### Roles
1. **ADMIN**: Full administrative access
2. **RESPONDER**: Full operational access (can do anything except admin-only actions)
3. **USER**: Read-only access

### Permission Helpers

Located in `src/lib/rbac.ts`:
- `getUserPermissions()`: Returns user permissions object
- `assertAdmin()`: Throws if user is not admin
- `assertAdminOrResponder()`: Throws if user is not admin or responder
- `assertResponderOrAbove()`: Throws if user is not responder or admin

### Permission Properties
- `isAdmin`: User is admin
- `isAdminOrResponder`: User is admin or responder
- `isResponderOrAbove`: User is responder or admin (same as above)

## Implementation by Feature

### 1. Quick Actions (Top Bar)
- **Location**: `src/components/QuickActions.tsx`
- **Behavior**: Only visible to responders and admins
- **Implementation**: Component accepts `canCreate` prop, returns `null` if false
- **Layout**: `src/app/(app)/layout.tsx` passes permissions

### 2. Incidents
- **Create**: `/incidents/create` - Only responders+
- **Edit/Manage**: Incident detail page - Only responders+
- **View**: All users can view incidents
- **Actions**: Status updates, notes, watchers - Only responders+
- **Files**:
  - `src/app/(app)/incidents/create/page.tsx`
  - `src/app/(app)/incidents/[id]/page.tsx`
  - `src/app/(app)/incidents/page.tsx`

### 3. Services
- **Create**: Only responders+
- **Delete**: Only admins
- **Edit**: Service detail page - Only responders+
- **View**: All users can view services
- **Files**:
  - `src/app/(app)/services/page.tsx`
  - `src/app/(app)/services/[id]/page.tsx`

### 4. Teams
- **Create**: Only responders+
- **Update**: Only responders+
- **Delete**: Only admins
- **Manage Members**: Only responders+
- **Assign Owner/Admin**: Only admins
- **View**: All users can view teams
- **Files**:
  - `src/app/(app)/teams/page.tsx`
  - Components: `TeamCard.tsx`, `TeamMemberForm.tsx`, `TeamMemberCard.tsx`

### 5. Schedules
- **Create**: Only responders+
- **Manage**: Only responders+ (layers, users, overrides)
- **View**: All users can view schedules
- **Files**:
  - `src/app/(app)/schedules/page.tsx`
  - `src/app/(app)/schedules/[id]/page.tsx`
  - Components: `LayerCard.tsx`, `OverrideForm.tsx`, `LayerCreateForm.tsx`

### 6. Policies
- **Create**: Only admins
- **View**: All users can view policies
- **Files**:
  - `src/app/(app)/policies/page.tsx`

### 7. Postmortems
- **Create**: Only responders+
- **Edit**: Only responders+
- **View Published**: All users can view published postmortems
- **View Drafts**: Only responders+
- **Files**:
  - `src/app/(app)/postmortems/page.tsx`
  - `src/app/(app)/postmortems/create/page.tsx`
  - `src/app/(app)/postmortems/[incidentId]/page.tsx`
  - `src/app/(app)/postmortems/actions.ts`

### 8. Action Items
- **Manage**: Only responders+ (can update status, assign, etc.)
- **View**: All users can view action items
- **Files**:
  - `src/app/(app)/action-items/page.tsx`
  - Components: `ActionItemsBoard.tsx`, `ActionItemsStats.tsx`

### 9. Users
- **Manage Roles**: Only admins
- **Deactivate/Reactivate**: Only admins
- **Delete**: Only admins
- **View**: All users can view user list
- **Files**:
  - `src/app/(app)/users/page.tsx` (if exists)
  - Components: `UserTable.tsx`

## UI Patterns

### 1. Conditional Rendering
```tsx
const permissions = await getUserPermissions();
const canCreate = permissions.isResponderOrAbove;

{canCreate ? (
    <CreateForm />
) : (
    <div>Read-only message</div>
)}
```

### 2. Disabled Forms
```tsx
{canManage ? (
    <form>...</form>
) : (
    <div style={{ opacity: 0.7 }}>
        <p>⚠️ You don't have access...</p>
        <form disabled>...</form>
    </div>
)}
```

### 3. Hidden Buttons
```tsx
{canDelete && (
    <DeleteButton />
)}
```

### 4. Server Actions
```tsx
async function createSomething() {
    'use server';
    await assertResponderOrAbove();
    // ... create logic
}
```

## Server Actions Protection

All server actions that modify data should check permissions:

```typescript
// Example from services/actions.ts
export async function createService(formData: FormData) {
    'use server';
    try {
        await assertAdminOrResponder();
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unauthorized');
    }
    // ... create logic
}
```

## Components with RBAC

1. **QuickActions**: Hidden for regular users
2. **CreateServiceForm**: Disabled for regular users
3. **TeamCreateForm**: Disabled for regular users
4. **TeamCard**: Edit/delete buttons hidden for regular users
5. **TeamMemberForm**: Disabled for regular users
6. **ScheduleCreateForm**: Disabled for regular users
7. **LayerCard**: Edit buttons hidden for regular users
8. **OverrideForm**: Disabled for regular users
9. **PostmortemForm**: Only visible to responders+
10. **ActionItemsBoard**: Edit actions disabled for regular users

## Testing Checklist

- [ ] Regular user cannot see Quick Actions button
- [ ] Regular user cannot create incidents
- [ ] Regular user cannot edit incidents
- [ ] Regular user cannot create services
- [ ] Regular user cannot delete services
- [ ] Regular user cannot create teams
- [ ] Regular user cannot edit teams
- [ ] Regular user cannot create schedules
- [ ] Regular user cannot edit schedules
- [ ] Regular user cannot create policies
- [ ] Regular user cannot create postmortems
- [ ] Regular user can view published postmortems
- [ ] Regular user cannot edit postmortems
- [ ] Regular user can view action items
- [ ] Regular user cannot edit action items
- [ ] Responder can do everything except admin-only actions
- [ ] Admin can do everything

## Notes

- All pages should check permissions at the page level
- All server actions should assert permissions
- UI should gracefully handle readonly state
- Error messages should be clear about permission requirements
- Regular users should still be able to view all data (read-only)

