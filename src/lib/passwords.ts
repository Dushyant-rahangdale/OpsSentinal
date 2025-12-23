export function validatePasswordStrength(password: string): string | null {
    if (password.length < 10) {
        return 'Password must be at least 10 characters.';
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLower || !hasUpper || !hasNumber) {
        return 'Password must include upper, lower, and numeric characters.';
    }

    return null;
}

