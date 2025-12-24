'use client';

type Props = {
    password: string;
};

export default function PasswordStrength({ password }: Props) {
    const getStrength = (pwd: string): { score: number; label: string; color: string } => {
        if (!pwd) return { score: 0, label: '', color: '' };
        
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;

        if (score <= 2) return { score, label: 'Weak', color: '#dc2626' };
        if (score <= 4) return { score, label: 'Fair', color: '#f59e0b' };
        if (score <= 5) return { score, label: 'Good', color: '#3b82f6' };
        return { score, label: 'Strong', color: '#22c55e' };
    };

    const { score, label, color } = getStrength(password);
    const percentage = (score / 6) * 100;

    if (!password) return null;

    return (
        <div className="password-strength">
            <div className="password-strength-bar">
                <div 
                    className="password-strength-fill"
                    style={{ 
                        width: `${percentage}%`,
                        backgroundColor: color
                    }}
                />
            </div>
            <div className="password-strength-label" style={{ color }}>
                {label}
            </div>
        </div>
    );
}










