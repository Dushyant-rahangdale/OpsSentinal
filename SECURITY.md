# Security Policy

## Supported Versions

We only provide security updates for the latest major version of OpsKnight.

| Version | Supported |
| ------- | --------- |
| 1.x.x   | ✅ Yes    |
| < 1.0.0 | ❌ No     |

## Reporting a Vulnerability

**Please do not open GitHub issues for security vulnerabilities.**

If you discover a security vulnerability within OpsKnight, please send an e-mail to the maintainers. All security vulnerabilities will be promptly addressed.

Please include the following in your report:

- Type of issue (e.g., SQL injection, XSS, RCE)
- Location of the vulnerability (URL or file/line number)
- Step-by-step instructions to reproduce the issue
- Potential impact

## Our Process

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
2. **Investigation**: We will investigate the issue and determine its severity.
3. **Fix**: We will develop a fix and test it thoroughly.
4. **Disclosure**: We will release a new version with the fix and provide credit to the reporter (if desired).

## Security Best Practices for Users

OpsKnight comes with several security features that should be configured correctly for production use:

- **SSO/OIDC**: Highly recommended for enterprise environments.
- **RBAC**: Ensure users have the minimum necessary permissions.
- **Encryption**: sensitive data (API keys, secrets) is encrypted in the database.
- **Audit Logs**: Regularly review audit logs for suspicious activity.

Thank you for helping keep OpsKnight secure!
