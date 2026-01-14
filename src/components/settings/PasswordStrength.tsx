'use client';

import { calculatePasswordStrength } from '@/lib/password-strength';

type Props = {
  password: string;
};

export default function PasswordStrength({ password }: Props) {
  const strength = calculatePasswordStrength(password);

  if (!password || !strength.label) return null;

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div
          className="password-strength-fill"
          style={{
            width: `${strength.percentage}%`,
            backgroundColor: strength.textColor.replace('text-', '').includes('rose')
              ? '#dc2626'
              : strength.textColor.includes('amber')
                ? '#f59e0b'
                : strength.textColor.includes('yellow')
                  ? '#eab308'
                  : strength.textColor.includes('emerald')
                    ? '#22c55e'
                    : strength.textColor.includes('cyan')
                      ? '#06b6d4'
                      : '#64748b',
          }}
        />
      </div>
      <div
        className="password-strength-label"
        style={{
          color: strength.textColor.replace('text-', '').includes('rose')
            ? '#dc2626'
            : strength.textColor.includes('amber')
              ? '#f59e0b'
              : strength.textColor.includes('yellow')
                ? '#eab308'
                : strength.textColor.includes('emerald')
                  ? '#22c55e'
                  : strength.textColor.includes('cyan')
                    ? '#06b6d4'
                    : '#64748b',
        }}
      >
        {strength.label}
      </div>
    </div>
  );
}
