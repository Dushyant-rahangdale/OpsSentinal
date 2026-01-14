# Authentication Security

OpsSentinal implements enterprise-grade authentication security features to protect your incident management platform. Our security architecture implements a defense-in-depth strategy covering the network, application, and data layers.

## Defense Depth Matrix

We explicitly protect against the following attack vectors:

| Attack Vector                         | Protection Mechanism      | Implementation Detail                                                                                                                                       |
| ------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brute Force & Credential Stuffing** | Intelligent Rate Limiting | IP & Identity-based throttling with exponential backoff (1m to 1h lockouts). Defined in `src/lib/login-security.ts`.                                        |
| **Timing Attacks**                    | Constant-Time Responses   | Invalid token lookups invoke `simulateWork()` to burn CPU time equivalent to a valid hash verification (~300ms), blinding attackers to token validity.      |
| **Race Conditions**                   | Transactional Integrity   | Critical operations (Password Reset, Invite Acceptance) start `prisma.$transaction` to ensure atomic execution of User Update + Token Consumption.          |
| **User Enumeration**                  | Uniform Responses         | Authentication and Reset endpoints return generic messages ("If an account exists...") and strictly enforce rate limits on _all_ inputs, valid or invalid.  |
| **Session Hijacking**                 | Token Versioning          | `revokeUserSessions` increments a `tokenVersion` counter in the database. Middleware invalidates any JWT with an outdated version immediately.              |
| **Weak Passwords**                    | dual-Layer Enforcement    | Password complexity (10+ chars, mixed case, numbers) is enforced by `validatePasswordStrength` on both Client (UI) and Server (API), preventing API bypass. |
| **Privilege Abuse**                   | Internal Controls         | Administrative actions (e.g., generating reset links) are strictly rate-limited and audit-logged to limit the blast radius of compromised admin accounts.   |
| **Host Header Injection**             | Configuration Trust       | Application URLs are derived strictly from server-side configuration/ENV, ignoring `Host` headers to prevent poisoning of reset links.                      |
| **IPv6 Rotation**                     | Subnet Normalization      | Login rate limiting groups IPv6 addresses by `/64` subnet, preventing attackers from bypassing blocks by rotating addresses within their allocation.        |
| **DoS (Application Layer)**           | Efficient Indexing        | Rate limit queries use high-performance database indexes (`createdAt`) to scan only recent logs, preventing slow-query Denial of Service.                   |

---

## Rate Limiting & Brute Force Protection

### How It Works

The login system tracks failed authentication attempts by email and IP address combination. After **5 failed attempts**, the account is temporarily locked.

**Progressive Lockout Duration:**
| Lockout Count | Duration |
|---------------|----------|
| 1st lockout | 1 minute |
| 2nd lockout | 5 minutes |
| 3rd lockout | 15 minutes |
| 4th+ lockout | 1 hour |

Attempt counts reset after 1 hour of inactivity.

### Configuration

The following settings can be adjusted in `src/lib/login-security.ts`:

```typescript
const LOGIN_SECURITY_CONFIG = {
  MAX_ATTEMPTS: 5, // Failed attempts before lockout
  BASE_LOCKOUT_MS: 60000, // Base lockout (1 minute)
  ATTEMPT_WINDOW_MS: 900000, // 15-minute sliding window
  RESET_AFTER_MS: 3600000, // Reset after 1 hour idle
};
```

---

## Audit Logging

All authentication events are logged for security monitoring and compliance.

### Logged Events

| Event Type                 | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `LOGIN_SUCCESS`            | Successful credential or SSO login                                           |
| `LOGIN_FAILED`             | Failed authentication attempt (Includes generic `INVITE_FAILED` for invites) |
| `LOGIN_BLOCKED`            | Attempt blocked due to lockout                                               |
| `LOGOUT`                   | User logout                                                                  |
| `PASSWORD_RESET_REQUESTED` | Password reset initiated                                                     |
| `PASSWORD_RESET_COMPLETED` | Password successfully changed                                                |
| `SESSION_EXPIRED`          | Session auto-expired                                                         |
| `SESSION_EXTENDED`         | User extended their session                                                  |

### Stored Information

Each audit log entry contains:

- **Timestamp** – When the event occurred
- **Email** – Account targeted
- **IP Address** – Source IP
- **User Agent** – Browser/device info
- **Success/Failure** – Whether the action succeeded
- **Failure Reason** – Why it failed (if applicable)

Logs are stored in the `AuditLog` database table with `entityType: AUTH_SESSION`.

---

## Password Requirements

OpsSentinal enforces strong password policies consistent across UI and API:

### Requirements

- Minimum **10 characters**
- At least one **uppercase letter** (A-Z)
- At least one **lowercase letter** (a-z)
- At least one **number** (0-9)
- Special characters recommended

### Password Strength Indicator

The UI shows real-time password strength feedback:

| Strength    | Score | Color      |
| ----------- | ----- | ---------- |
| Weak        | 0-2   | Red        |
| Fair        | 3-4   | Orange     |
| Good        | 5-6   | Yellow     |
| Strong      | 7-8   | Green      |
| Very Strong | 9-10  | Dark Green |

---

## Remember Me & Session Management

### Session Durations

| Setting          | Duration | Cookie Type  |
| ---------------- | -------- | ------------ |
| Standard Session | 7 days   | Session-only |
| Remember Me      | 30 days  | Persistent   |

### Session Timeout Warning

For security, inactive sessions are automatically ended. Users receive a warning **5 minutes before expiry** with options to extended or sign out.

---

## Security Best Practices (Implemented)

1.  **Never log passwords** – Only hashed values stored.
2.  **HTTPS required** – All auth traffic encrypted.
3.  **Secure cookies** – HttpOnly, Secure, SameSite=Lax.
4.  **Strict Referrer Policy** - Protected pages prevent leakage of reset tokens via Referrer headers.
5.  **Input Validation** - Server-side validation rejects invalid emails before database lookups.
6.  **Accessibility** - Full WCAG 2.1 compliance for error messaging and forms.

---

## Related Files

| File                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `src/lib/login-security.ts`       | Rate limiting & lockout logic                     |
| `src/lib/login-audit.ts`          | Audit logging functions                           |
| `src/lib/auth.ts`                 | NextAuth configuration & Session Management       |
| `src/lib/password-reset.ts`       | Reset logic, timing mitigation, and rate limiting |
| `src/app/set-password/actions.ts` | Secure Invite Flow                                |
