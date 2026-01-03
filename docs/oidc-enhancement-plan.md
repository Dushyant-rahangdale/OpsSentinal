# OIDC Role Mapping & Enhancements

## Goal Description

Enhance the Single Sign-On (SSO) integration to support **Enterprise Role Mapping**. This allows administrators to automatically assign OpsSentinel roles (Admin, User, Responder) based on Identity Provider (IdP) attributes (e.g., "groups" claim).

This change moves the system from "basic authentication" to "enterprise-ready authorization," reducing manual user management overhead.

## User Review Required

> [!IMPORTANT]
> **Schema Change**: This adds `roleMapping` (Json) and `scopes` (String) to the `OidcConfig` table. A migration will be required.

## Proposed Changes

### Database Schema

#### [MODIFY] [prisma/schema.prisma](file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/prisma/schema.prisma)

- Add `roleMapping` (Json) to `OidcConfig` model.
- Add `scopes` (String) to `OidcConfig` model (to request `groups`, etc.).

### User Interface

#### [MODIFY] [src/components/settings/SsoSettingsForm.tsx](file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/src/components/settings/SsoSettingsForm.tsx)

- Add "Role Mapping" section.
- Add dynamic list UI: [Claim Name] equals [Value] -> Assign [Role].
- Add "Custom Scopes" input field (e.g. `openid email profile groups`).

### Backend Logic

#### [MODIFY] [src/app/(app)/settings/security/actions.ts](<file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/src/app/(app)/settings/security/actions.ts>)

- Update `saveOidcConfig` to persist `roleMapping` and `scopes`.

#### [MODIFY] [src/lib/auth.ts](file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/src/lib/auth.ts)

- Update `signIn` callback to:
  1. Retrieve `OidcConfig` with mappings.
  2. Inspect User Profile / Tokens for claims.
  3. If a rule matches, update `User.role` in the database.
  4. Provide fallback (default role) if no rules match.

#### [MODIFY] [src/lib/oidc.ts](file:///c:/Users/Dushyant.Rahangdale/Repo/OpsSentinal/src/lib/oidc.ts)

- Pass configured `scopes` to the provider.

## Verification Plan

### Automated Tests

- Create unit tests for `evaluateRoleMapping(profile, rules)` logic.
- Verify that `signIn` callback calls this logic correctly.

### Manual Verification

- Simulate a login flow by mocking the OIDC profile response with specific claims (e.g. `groups: ['admins']`).
- Verify the user's role is updated in the database.
