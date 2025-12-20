# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented across the OpsGuard incident management application. The system ensures that users can only perform actions appropriate to their role, with proper server-side validation and UI-level restrictions.

## Architecture

### Shared RBAC Utilities (`src/lib/rbac.ts`)

A centralized RBAC utility module provides reusable functions for permission checks:

#### Core Functions

- **`getCurrentUser()`**: Retrieves the current logged-in user from the session
- **`assertAdmin()`**: Ensures the user has ADMIN role, throws error if not
- **`assertAdminOrResponder()`**: Ensures the user has ADMIN or RESPONDER role
- **`assertResponderOrAbove()`**: Ensures the user has RESPONDER role or higher
- **`assertNotSelf(currentUserId, targetUserId, action)`**: Prevents users from modifying their own account
- **`getUserPermissions()`**: Returns a permissions object for the current user

## Role Hierarchy

The application uses three role levels:

1. **USER** - Basic read-only access
2. **RESPONDER** - Can manage incidents, schedules, and teams (with restrictions)
3. **ADMIN** - Full system access

## Permission Matrix

| Action | USER | RESPONDER | ADMIN |
|--------|------|-----------|-------|
| **Incidents** |
| View incidents | ✅ | ✅ | ✅ |
| Create incidents | ❌ | ✅ | ✅ |
| Update incident status | ❌ | ✅ | ✅ |
| Resolve incidents | ❌ | ✅ | ✅ |
| Add notes | ❌ | ✅ | ✅ |
| Reassign incidents | ❌ | ✅ | ✅ |
| Manage watchers | ❌ | ✅ | ✅ |
| **Teams** |
| View teams | ✅ | ✅ | ✅ |
| Create teams | ❌ | ✅ | ✅ |
| Update teams | ❌ | ✅ | ✅ |
| Delete teams | ❌ | ❌ | ✅ |
| Add team members | ❌ | ✅* | ✅ |
| Update member roles | ❌ | ✅* | ✅ |
| Remove team members | ❌ | ✅ | ✅ |
| **Schedules** |
| View schedules | ✅ | ✅ | ✅ |
| Create schedules | ❌ | ✅ | ✅ |
| Manage layers | ❌ | ✅ | ✅ |
| Manage overrides | ❌ | ✅ | ✅ |
| **Services** |
| View services | ✅ | ✅ | ✅ |
| Create integrations | ❌ | ✅ | ✅ |
| Update services | ❌ | ✅ | ✅ |
| Delete services | ❌ | ❌ | ✅ |
| **Policies** |
| View policies | ✅ | ✅ | ✅ |
| Create policies | ❌ | ❌ | ✅ |
| **Users** |
| View users | ✅ | ✅ | ✅ |
| Create users | ❌ | ❌ | ✅ |
| Update user roles | ❌ | ❌ | ✅ |
| Deactivate users | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| Bulk user actions | ❌ | ❌ | ✅ |

\* Responders can add members and update roles, but **only admins can assign OWNER or ADMIN team roles**.

## Implementation Details

### Users Page (`src/app/(app)/users/`)

**Actions Protected:**
- `addUser` - Admin only
- `updateUserRole` - Admin only, prevents self-modification
- `deactivateUser` - Admin only, prevents self-deactivation
- `reactivateUser` - Admin only
- `deleteUser` - Admin only, prevents self-deletion
- `addUserToTeam` - Admin or Responder (only admins can assign OWNER/ADMIN roles)
- `generateInvite` - Admin only
- `bulkUpdateUsers` - Admin only, prevents self-modification in bulk actions

**UI Restrictions:**
- Role selector only visible to admins
- Deactivate/Delete buttons hidden for current user's own account
- Bulk actions panel only visible to admins
- Invite user panel only visible to admins
- Team assignment form shows role options based on user permissions

### Teams Page (`src/app/(app)/teams/`)

**Actions Protected:**
- `createTeam` - Admin or Responder
- `updateTeam` - Admin or Responder
- `deleteTeam` - Admin only
- `addTeamMember` - Admin or Responder (only admins can assign OWNER/ADMIN roles)
- `updateTeamMemberRole` - Admin or Responder (only admins can assign OWNER/ADMIN roles)
- `removeTeamMember` - Admin or Responder

**Special Rules:**
- Each team must have at least one OWNER
- Cannot remove the last OWNER from a team
- Only admins can assign OWNER or ADMIN team roles

### Incidents Page (`src/app/(app)/incidents/`)

**Actions Protected:**
- `createIncident` - Responder or above
- `updateIncidentStatus` - Responder or above
- `resolveIncidentWithNote` - Responder or above
- `updateIncidentUrgency` - Responder or above
- `addNote` - Responder or above
- `reassignIncident` - Responder or above
- `addWatcher` - Responder or above
- `removeWatcher` - Responder or above

**Note:** All incident management actions require Responder role or higher. Regular users can only view incidents.

### Schedules Page (`src/app/(app)/schedules/`)

**Actions Protected:**
- `createSchedule` - Admin or Responder
- `createLayer` - Admin or Responder
- `updateLayer` - Admin or Responder
- `deleteLayer` - Admin or Responder
- `addLayerUser` - Admin or Responder
- `removeLayerUser` - Admin or Responder
- `moveLayerUser` - Admin or Responder
- `createOverride` - Admin or Responder
- `deleteOverride` - Admin or Responder

### Services Page (`src/app/(app)/services/`)

**Actions Protected:**
- `createIntegration` - Admin or Responder
- `updateService` - Admin or Responder
- `deleteService` - Admin only

### Policies Page (`src/app/(app)/policies/`)

**Actions Protected:**
- `createPolicy` - Admin only

## Self-Protection Rules

The system includes several self-protection mechanisms to prevent users from accidentally or maliciously modifying their own accounts:

1. **Users cannot change their own role** - Prevents privilege escalation
2. **Users cannot deactivate their own account** - Prevents accidental lockout
3. **Users cannot delete their own account** - Prevents accidental deletion
4. **Users cannot modify themselves in bulk actions** - Prevents self-modification through bulk operations

## Error Handling

All RBAC-protected actions return appropriate error messages:

- **Unauthorized access**: "Unauthorized. [Role] access required."
- **Self-modification attempts**: "You cannot [action] your own account."
- **Role assignment restrictions**: "Only admins can assign OWNER or ADMIN roles."

## Usage Examples

### In Server Actions

```typescript
import { assertAdmin, assertAdminOrResponder, getCurrentUser } from '@/lib/rbac';

export async function deleteUser(userId: string) {
    try {
        const currentUser = await assertAdmin();
        assertNotSelf(currentUser.id, userId, 'delete');
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unauthorized' };
    }
    // ... perform action
}
```

### In Server Components

```typescript
import { getUserPermissions } from '@/lib/rbac';

export default async function MyPage() {
    const permissions = await getUserPermissions();
    
    return (
        <div>
            {permissions.isAdmin && (
                <AdminPanel />
            )}
            {permissions.isAdminOrResponder && (
                <ResponderPanel />
            )}
        </div>
    );
}
```

## Security Considerations

1. **Server-Side Validation**: All permission checks are performed server-side. Client-side UI restrictions are for UX only and do not provide security.

2. **Defense in Depth**: Both UI-level and server-level checks are implemented to provide multiple layers of protection.

3. **Audit Logging**: All actions are logged with the actor's information for audit purposes.

4. **Session Management**: User roles are stored in the JWT session token and validated on each request.

5. **Type Safety**: TypeScript types ensure role values are correctly typed throughout the application.

## Testing Recommendations

When testing RBAC:

1. **Test each role** - Verify USER, RESPONDER, and ADMIN can only access appropriate actions
2. **Test self-protection** - Verify users cannot modify their own accounts
3. **Test role boundaries** - Verify role assignment restrictions (e.g., responders cannot assign OWNER)
4. **Test error messages** - Verify appropriate error messages are shown for unauthorized actions
5. **Test UI visibility** - Verify UI elements are hidden/shown based on permissions

## Future Enhancements

Potential improvements to the RBAC system:

1. **Team-based permissions** - Allow team owners to manage their team members
2. **Resource-level permissions** - Fine-grained control over specific resources
3. **Permission inheritance** - Allow permissions to be inherited from team memberships
4. **Custom roles** - Support for custom role definitions
5. **Permission caching** - Cache user permissions for better performance

## Visual Feedback Implementation

All pages now include visual feedback for restricted actions:

### Teams Page
- **Create Team**: Greyed out with warning for non-responders
- **Delete Team**: Disabled button for non-admins
- **Update Team**: Greyed out form with warning for non-responders
- **Member Management**: 
  - Role selector disabled with warnings for OWNER/ADMIN roles (non-admins)
  - "⚠️ Admin required" indicator shown
  - "⚠️ No edit access" for users without permissions
- **Add Member**: Greyed out form with role restrictions clearly marked

### Policies Page
- **Create Policy**: Greyed out form with warning for non-admins

### Services Page
- **Create Service**: Greyed out form with warning for non-responders

### Incidents Page
- **Create Incident Button**: Disabled with tooltip for non-responders
- **Incident Detail Page**:
  - **Urgency Change**: Disabled with warning for non-responders
  - **Assignee Reassignment**: Disabled with warning for non-responders
  - **Add Note**: Greyed out form with warning for non-responders
  - **Acknowledge**: Disabled button with warning for non-responders
  - **Resolve**: Greyed out form with warning for non-responders
  - **Watcher Management**: Greyed out forms with warnings for non-responders

### Create Incident Page
- **Full Page Restriction**: Shows access denied message and disabled form for non-responders

### Schedules Page
- **New Schedule Button**: Disabled with tooltip for non-responders/non-admins
- **Create Schedule Form**: Greyed out with warning for non-responders/non-admins
- **Schedule Detail Page**:
  - **Create Layer Form**: Greyed out with warning for non-responders/non-admins
  - **Delete Layer Button**: Disabled with tooltip for non-responders/non-admins
  - **Update Layer Form**: Greyed out with warning for non-responders/non-admins
  - **Add Layer User Form**: Greyed out with warning for non-responders/non-admins
  - **Remove Layer User Button**: Disabled with tooltip for non-responders/non-admins
  - **Move Layer User Buttons**: Disabled with tooltip for non-responders/non-admins
  - **Create Override Form**: Greyed out with warning for non-responders/non-admins
  - **Delete Override Button**: Disabled with tooltip for non-responders/non-admins

## Files Modified

- `src/lib/rbac.ts` - Shared RBAC utilities (NEW)
- `src/app/(app)/users/actions.ts` - User management RBAC
- `src/app/(app)/users/page.tsx` - User page UI restrictions
- `src/components/UserTable.tsx` - User table permission-based UI
- `src/app/(app)/teams/actions.ts` - Team management RBAC
- `src/app/(app)/teams/page.tsx` - Team page UI restrictions with visual feedback
- `src/app/(app)/incidents/actions.ts` - Incident management RBAC
- `src/app/(app)/incidents/page.tsx` - Incident list page with permission checks
- `src/app/(app)/incidents/[id]/page.tsx` - Incident detail page with visual feedback
- `src/app/(app)/incidents/create/page.tsx` - Create incident page with access control
- `src/app/(app)/schedules/actions.ts` - Schedule management RBAC
- `src/app/(app)/schedules/page.tsx` - Schedule list page with permission checks
- `src/app/(app)/schedules/[id]/page.tsx` - Schedule detail page with visual feedback
- `src/components/TimeZoneSelect.tsx` - Added disabled prop support
- `src/app/(app)/services/actions.ts` - Service management RBAC
- `src/app/(app)/services/page.tsx` - Service page UI restrictions
- `src/app/(app)/policies/actions.ts` - Policy management RBAC
- `src/app/(app)/policies/page.tsx` - Policy page UI restrictions

## Conclusion

The RBAC system provides comprehensive access control across the application, ensuring users can only perform actions appropriate to their role. The centralized utility functions make it easy to maintain and extend the permission system as the application grows.

