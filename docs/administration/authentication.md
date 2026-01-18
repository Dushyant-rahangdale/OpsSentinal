---
order: 1
---

# Authentication

Configure how users authenticate with OpsKnight and how identities map to roles.

## Authentication Methods

| Method   | Best For                 |
| -------- | ------------------------ |
| Local    | Small teams, development |
| SSO/OIDC | Enterprise, compliance   |

## Local Authentication

Local authentication uses email and password.

### Create a User

```bash
npm run opsknight -- \
  --user "John Doe" \
  --email john@company.com \
  --password SecurePass123! \
  --role responder
```

> **Tip:** Use a password manager and rotate passwords periodically.

## SSO / OIDC Authentication

Single sign-on is recommended for production. Configure your identity provider in the Security section.

- [OIDC SSO Setup](../security/oidc-setup.md)

### Role Mapping

Map identity provider claims to OpsKnight roles in **Settings → Authentication → Role Mapping**.

Example mapping:

```
Provider Role    → OpsKnight Role
admin            → Admin
engineer         → Responder
viewer           → User
```

## Session Management

Users can view and revoke active sessions:

1. Go to **Settings → Security**
2. Open **Active Sessions**
3. Click **Revoke** to end a session

## Security Notes

- Protect `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`.
- Use HTTPS for production environments.
- Review user access regularly.
