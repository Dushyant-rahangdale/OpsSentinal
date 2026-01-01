'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setMessage('');

        if (!email.trim()) {
            setError('Email is required');
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                setIsSent(true);
                setMessage(data.message);
            } else {
                setError(data.message || 'Something went wrong.');
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
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem 1.5rem',
            boxSizing: 'border-box'
        }}>
            {/* Logo & Branding */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    <img
                        src="/logo.svg"
                        alt="OpsSentinal"
                        style={{ width: '48px', height: '48px' }}
                    />
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)'
                    }}>
                        OpsSentinal
                    </span>
                </div>
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: '0 0 0.5rem'
                }}>
                    Reset Password
                </h1>
                <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                    margin: 0
                }}>
                    Enter your email to receive instructions
                </p>
            </div>

            {/* Success State */}
            {isSent ? (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--badge-success-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--badge-success-text)" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            margin: '0 0 0.5rem'
                        }}>
                            Check your inbox
                        </h2>
                        <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            margin: 0,
                            maxWidth: '280px'
                        }}>
                            {message}
                        </p>
                    </div>
                    <Link
                        href="/m/login"
                        style={{
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            background: 'var(--primary)',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        Return to Sign In
                    </Link>
                </div>
            ) : (
                /* Form State */
                <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                    {/* Email Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.5rem'
                        }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            placeholder="name@company.com"
                            autoComplete="email"
                            disabled={isSubmitting}
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

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: 'var(--badge-error-bg)',
                            color: 'var(--badge-error-text)',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
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
                        {isSubmitting ? 'Sending...' : 'Send Instructions'}
                    </button>

                    {/* Help Text */}
                    <div style={{
                        marginTop: '2rem',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            margin: '0 0 1rem'
                        }}>
                            If you don&apos;t receive an email, please contact your administrator.
                        </p>
                        <Link
                            href="/m/login"
                            style={{
                                fontSize: '0.9rem',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontWeight: '500'
                            }}
                        >
                            ← Back to Sign In
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}
