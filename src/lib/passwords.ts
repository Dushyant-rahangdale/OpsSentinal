/**
 * Central password policy shared by every credential-setting flow.
 *
 * Passwords are treated as opaque user secrets: we do not trim or normalize the
 * value before hashing. NFKC/case folding is used only for compromised/default
 * password comparisons so creation and authentication retain identical bytes.
 */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_UTF8_BYTES = 72;

export type PasswordValidationContext = {
  email?: string | null;
  displayName?: string | null;
  organizationName?: string | null;
  hostname?: string | null;
};

const COMPROMISED_PASSWORDS = new Set([
  '123456789012345',
  'passwordpassword',
  'password123456789',
  'qwertyqwertyqwerty',
  'letmeinletmeinletmein',
  'adminadminadmin',
  'administrator123',
  'welcome123456789',
  'changemechangeme',
  'correcthorsebatterystaple',
  'opsknightopsknight',
]);

function comparisonForm(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

/** Unicode code-point length. This intentionally does not mutate the secret. */
export function getPasswordCharacterLength(password: string): number {
  return Array.from(password).length;
}

export function getPasswordUtf8Length(password: string): number {
  return new TextEncoder().encode(password).length;
}

function identityCandidates(context?: PasswordValidationContext): Set<string> {
  const candidates = new Set<string>();
  if (!context) return candidates;

  const add = (value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized) return;
    candidates.add(comparisonForm(normalized));
  };

  add(context.displayName);
  add(context.organizationName);
  add(context.hostname);
  add(context.email);
  if (context.email) add(context.email.split('@')[0]);
  return candidates;
}

/**
 * Offline compromised/default-password abstraction. Keep network lookups out of
 * credential mutation paths; the backing corpus can later be replaced by a
 * versioned Bloom filter or hashed breach corpus without changing callers.
 */
export function isCompromisedPassword(
  password: string,
  context?: PasswordValidationContext
): boolean {
  const candidate = comparisonForm(password);
  if (COMPROMISED_PASSWORDS.has(candidate)) return true;

  // Reject secrets that are exactly a user/instance identifier. Avoid broad
  // substring checks, which cause surprising false positives for passphrases.
  return identityCandidates(context).has(candidate);
}

/** @deprecated Prefer isCompromisedPassword. */
export function isCommonPassword(password: string): boolean {
  return isCompromisedPassword(password);
}

export function validatePasswordStrength(
  password: string,
  context?: PasswordValidationContext
): string | null {
  if (typeof password !== 'string') return 'Password is required.';

  const characterLength = getPasswordCharacterLength(password);
  if (characterLength < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (characterLength > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (getPasswordUtf8Length(password) > PASSWORD_MAX_UTF8_BYTES) {
    return `Password is too long for the current password hashing backend (maximum ${PASSWORD_MAX_UTF8_BYTES} UTF-8 bytes).`;
  }
  if (password.includes('\u0000')) {
    return 'Password contains an unsupported null character.';
  }
  if (isCompromisedPassword(password, context)) {
    return 'Choose a password that is not a commonly used, default, or account-identifying password.';
  }
  return null;
}
