import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_UTF8_BYTES,
  PASSWORD_MIN_LENGTH,
  validatePasswordStrength,
} from '@/lib/passwords';

describe('validatePasswordStrength', () => {
  it('enforces the minimum length without composition rules', () => {
    expect(validatePasswordStrength('short password')).toContain(`${PASSWORD_MIN_LENGTH}`);
    expect(validatePasswordStrength('this is a long passphrase')).toBeNull();
    expect(validatePasswordStrength('alllowercasebutlongenough')).toBeNull();
  });

  it('allows whitespace and unicode when within the hashing limit', () => {
    expect(validatePasswordStrength('spaces are valid here')).toBeNull();
    expect(validatePasswordStrength('安全な passphrase 123')).toBeNull();
  });

  it('rejects the configured character maximum', () => {
    expect(validatePasswordStrength('x'.repeat(PASSWORD_MAX_LENGTH + 1))).toContain(
      `${PASSWORD_MAX_LENGTH}`
    );
  });

  it('rejects bcrypt-truncating UTF-8 inputs explicitly', () => {
    const password = '界'.repeat(Math.ceil(PASSWORD_MAX_UTF8_BYTES / 3) + 1);
    expect(validatePasswordStrength(password)).toContain('UTF-8 bytes');
  });

  it('rejects common/default passwords', () => {
    expect(validatePasswordStrength('correcthorsebatterystaple')).toContain('commonly used');
    expect(validatePasswordStrength('PasswordPassword')).toContain('commonly used');
  });

  it('rejects embedded null characters', () => {
    expect(validatePasswordStrength('long-enough-pass\u0000word')).toContain('null character');
  });
});
