'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
    callbackUrl: string;
    errorCode?: string | null;
    passwordSet?: boolean;
    ssoEnabled: boolean;
};

function formatError(message: string | null | undefined) {
    if (!message) return '';
    if (message === 'CredentialsSignin') return 'Invalid email or password.';
    if (message === 'AccessDenied') return 'Access denied. Contact your admin.';
    if (message === 'Configuration') return 'Server configuration error.';
    return 'Unable to sign in. Please try again.';
}

export default function MobileLoginClient({ callbackUrl, errorCode, passwordSet, ssoEnabled }: Props) {
    const router = useRouter();
    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSSOLoading, setIsSSOLoading] = useState(false);

    useEffect(() => {
        if (errorCode) {
            setError(formatError(errorCode));
        }
    }, [errorCode]);

    useEffect(() => {
        emailInputRef.current?.focus();
    }, []);

    const handleSSO = async () => {
        setIsSSOLoading(true);
        setError('');
        try {
            await signIn('oidc', { callbackUrl });
        } catch {
            setError('SSO authentication failed.');
            setIsSSOLoading(false);
        }
    };

    const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Email is required');
            emailInputRef.current?.focus();
            return;
        }

        if (!password) {
            setError('Password is required');
            passwordInputRef.current?.focus();
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email: email.trim(),
                password,
                callbackUrl
            });

            if (result?.error) {
                setError(formatError(result.error));
                setPassword('');
                passwordInputRef.current?.focus();
            } else if (result?.ok) {
                router.push(result?.url || callbackUrl);
            }
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            boxSizing: 'border-box'
        }}>
            {/* Main Card */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--card-bg)',
                borderRadius: '20px',
                padding: '2rem 1.5rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid var(--border)'
            }}>
                {/* Logo & Branding */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        marginBottom: '1.25rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(220, 38, 38, 0.08)',
                        borderRadius: '40px'
                    }}>
                        <img
                            src="/logo.svg"
                            alt="OpsSentinal"
                            style={{ width: '32px', height: '32px' }}
                        />
                        <span style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)'
                        }}>
                            OpsSentinal
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.6rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        margin: '0 0 0.5rem',
                        letterSpacing: '-0.02em'
                    }}>
                        Welcome back
                    </h1>
                    <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        margin: 0
                    }}>
                        Sign in to your dashboard
                    </p>
                </div>

                {/* SSO Button */}
                {ssoEnabled && (
                    <>
                        <button
                            type="button"
                            onClick={handleSSO}
                            disabled={isSSOLoading || isSubmitting}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--primary)',
                                background: 'transparent',
                                color: 'var(--primary)',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginBottom: '1.5rem',
                                opacity: isSSOLoading ? 0.7 : 1
                            }}
                        >
                            {isSSOLoading ? (
                                <span>Connecting...</span>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span>Continue with SSO</span>
                                </>
                            )}
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        </div>
                    </>
                )}

                {/* Success/Error Messages */}
                {passwordSet && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--badge-success-bg)',
                        color: 'var(--badge-success-text)',
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Password set successfully!
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--badge-error-bg)',
                        color: 'var(--badge-error-text)',
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleCredentials} style={{ flex: 1 }}>
                    {/* Email Field */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.5rem'
                        }}>
                            Email
                        </label>
                        <input
                            ref={emailInputRef}
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            placeholder="name@company.com"
                            autoComplete="email"
                            disabled={isSubmitting || isSSOLoading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <label style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--text-secondary)'
                            }}>
                                Password
                            </label>
                            <a
                                href="/m/forgot-password"
                                style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--primary)',
                                    textDecoration: 'none'
                                }}
                            >
                                Forgot?
                            </a>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={passwordInputRef}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isSubmitting || isSSOLoading}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    paddingRight: '3rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '0.25rem'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || isSSOLoading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? (
                            <span>Signing in...</span>
                        ) : (
                            <>
                                <span>Sign in</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border)'
                }}>
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Need help? Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
