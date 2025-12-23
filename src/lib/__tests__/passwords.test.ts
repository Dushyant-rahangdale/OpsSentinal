import { describe, expect, it } from 'vitest';
import { validatePasswordStrength } from '@/lib/passwords';

describe('validatePasswordStrength', () => {
    it('rejects short passwords', () => {
        expect(validatePasswordStrength('Short1')).toBeTruthy();
    });

    it('requires upper, lower, and number', () => {
        expect(validatePasswordStrength('alllowercase1')).toBeTruthy();
        expect(validatePasswordStrength('ALLUPPERCASE1')).toBeTruthy();
        expect(validatePasswordStrength('NoNumbersHere')).toBeTruthy();
    });

    it('accepts strong passwords', () => {
        expect(validatePasswordStrength('StrongPass1')).toBeNull();
    });
});

