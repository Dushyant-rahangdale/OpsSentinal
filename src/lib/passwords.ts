/**
 * Central password policy shared by every credential-setting flow.
 *
 * Policy goals:
 * - long passwords/passphrases instead of composition rules;
 * - Unicode and whitespace are allowed;
 * - common compromised/default passwords are rejected;
 * - bcrypt's 72-byte input ceiling is enforced explicitly so passwords are
 *   never silently truncated by the current hashing backend.
 */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_UTF8_BYTES = 72;

const COMMON_PASSWORDS = new Set([
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

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.normalize('NFKC').toLocaleLowerCase('en-US'));
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (utf8Length(password) > PASSWORD_MAX_UTF8_BYTES) {
    return `Password is too long for the current password hashing backend (maximum ${PASSWORD_MAX_UTF8_BYTES} UTF-8 bytes).`;
  }
  if (password.includes('\u0000')) {
    return 'Password contains an unsupported null character.';
  }
  if (isCommonPassword(password)) {
    return 'Choose a password that is not a commonly used or default password.';
  }
  return null;
}
