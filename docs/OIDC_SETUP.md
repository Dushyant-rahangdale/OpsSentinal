# OIDC Single Sign-On (SSO) Setup

This guide explains how to configure OIDC SSO in OpsSentinal for common providers.

Table of contents

- Prerequisites
- Common configuration fields
- OpsSentinal setup steps
- Provider guides
  - Google Workspace
  - Microsoft Entra ID (Azure AD)
  - Okta
  - Auth0
  - Keycloak
- Role mapping and profile mapping
- Troubleshooting

Prerequisites

- OpsSentinal admin access
- Your IdP OIDC app registration created
- A stable base URL for OpsSentinal (used for redirect/callback)
- ENCRYPTION_KEY configured (required to store client secret)

Common configuration fields

- Issuer URL: The OIDC issuer URL for your provider
- Client ID: From your IdP app
- Client Secret: From your IdP app
- Callback URL: https://YOUR_BASE_URL/api/auth/callback/oidc
- Scopes: OpsSentinal requests openid email profile by default; you can add custom scopes
- Allowed domains: Optional allowlist of email domains for SSO
- Auto-provision users: If disabled, only existing users can sign in

OpsSentinal setup steps

1. Go to Settings -> Security -> Single sign-on (OIDC)
2. Enable SSO
3. Enter Issuer URL, Client ID, Client Secret
4. Add optional custom scopes, allowed domains, role mapping, and profile mapping
5. Save, then test with the SSO button on the login page

Provider guides

Google Workspace

1. Create an OAuth app in Google Cloud Console
2. Configure OAuth consent screen
3. Create OAuth client credentials (Web application)
4. Authorized redirect URIs: https://YOUR_BASE_URL/api/auth/callback/oidc
5. Issuer URL: https://accounts.google.com
6. Scopes: openid email profile (default)
7. Claims for profile mapping
   - department: Not provided by Google
   - jobTitle: Not provided by Google
   - avatarUrl: picture

Microsoft Entra ID (Azure AD)

1. Register an app in Azure Entra ID
2. Add a Web platform redirect URI: https://YOUR_BASE_URL/api/auth/callback/oidc
3. Create a client secret
4. Issuer URL (tenant specific):
   https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0
5. Scopes: openid email profile (default)
6. Optional claims: Add email and profile claims if not present
7. Common claim names for profile mapping
   - department: department
   - jobTitle: jobTitle
   - avatarUrl: picture

Okta

1. Create an OIDC Web App integration
2. Sign-in redirect URI: https://YOUR_BASE_URL/api/auth/callback/oidc
3. Issuer URL: https://YOUR_OKTA_DOMAIN/oauth2/default
4. Scopes: openid email profile (default)
5. Profile mapping claims
   - department: department
   - jobTitle: title
   - avatarUrl: picture

Auth0

1. Create a Regular Web Application
2. Allowed Callback URLs: https://YOUR_BASE_URL/api/auth/callback/oidc
3. Issuer URL: https://YOUR_DOMAIN
4. Scopes: openid email profile (default)
5. Profile mapping claims
   - department: use custom claim, e.g. https://example.com/department
   - jobTitle: use custom claim, e.g. https://example.com/title
   - avatarUrl: picture
     Note: If you use namespaced custom claims, set the exact claim key in profile mapping.

Keycloak

1. Create a Realm and Client (OpenID Connect)
2. Client Access Type: Confidential
3. Valid Redirect URIs: https://YOUR_BASE_URL/api/auth/callback/oidc
4. Issuer URL:
   https://YOUR_KEYCLOAK_HOST/realms/YOUR_REALM
5. Scopes: openid email profile (default)
6. Profile mapping claims
   - department: department
   - jobTitle: jobTitle
   - avatarUrl: picture

Role mapping and profile mapping

Role mapping

- Provide a JSON array of rules
- Each rule has claim, value, role
- role must be ADMIN, RESPONDER, or USER

Example
[
{ "claim": "groups", "value": "admins", "role": "ADMIN" },
{ "claim": "groups", "value": "responders", "role": "RESPONDER" }
]

Profile mapping

- Map IdP claim names to user fields
- Supported fields: department, jobTitle, avatarUrl

Example

- department: department
- jobTitle: title
- avatarUrl: picture

Troubleshooting

- SSO button not showing: Check SSO enabled and config decrypts (ENCRYPTION_KEY)
- Validation fails: Confirm issuer URL is HTTPS and discovery document is reachable
- Access denied: Check allowed domains and auto-provision settings
- Missing email: Ensure IdP sends email claim
- Profile fields not syncing: Confirm claim names and that values are present
