'use client';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_UTF8_BYTES,
  PASSWORD_MIN_LENGTH,
  isCommonPassword,
  validatePasswordStrength,
} from '@/lib/passwords';

export interface PasswordStrengthResult {
  score: number;
  label: string;
  color: string;
  textColor: string;
  percentage: number;
  meetsMinimum: boolean;
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * UX strength indicator. Acceptance remains controlled solely by the shared
 * server-compatible password policy; character-class composition is never a
 * requirement.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: '',
      textColor: '',
      percentage: 0,
      meetsMinimum: false,
    };
  }

  const meetsMinimum = validatePasswordStrength(password) === null;
  let score = 1;
  if (password.length >= 10) score = 2;
  if (password.length >= PASSWORD_MIN_LENGTH) score = 3;
  if (meetsMinimum) score = 4;
  if (meetsMinimum && password.length >= 24) score = 5;

  const map: Record<number, Omit<PasswordStrengthResult, 'meetsMinimum'>> = {
    0: { score: 0, label: '', color: '', textColor: '', percentage: 0 },
    1: { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500', percentage: 20 },
    2: { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500', percentage: 40 },
    3: { score: 3, label: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-600', percentage: 60 },
    4: { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600', percentage: 80 },
    5: { score: 5, label: 'Excellent', color: 'bg-cyan-500', textColor: 'text-cyan-600', percentage: 100 },
  };

  return { ...map[score], meetsMinimum };
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      label: `No more than ${PASSWORD_MAX_LENGTH} characters`,
      met: password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      label: `Within ${PASSWORD_MAX_UTF8_BYTES} UTF-8 bytes (bcrypt safety limit)`,
      met: utf8Length(password) <= PASSWORD_MAX_UTF8_BYTES,
    },
    { label: 'Not a common/default password', met: password.length > 0 && !isCommonPassword(password) },
  ];
}

export function isPasswordStrong(password: string, _minScore: number = 4): boolean {
  return validatePasswordStrength(password) === null;
}
