'use client';

import { useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
    callbackUrl: string;
    errorCode?: string | null;
    passwordSet?: boolean;
};

function formatError(message: string | null | undefined) {
    if (!message) return '';
    if (message === 'CredentialsSignin') return 'Invalid email or password.';
    if (message === 'AccessDenied') return 'Access denied. Contact your administrator.';
    return 'Unable to sign in. Please try again.';
}

export default function LoginClient({ callbackUrl, errorCode, passwordSet }: Props) {
    const router = useRouter();
    const initialError = useMemo(() => formatError(errorCode), [errorCode]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(initialError);

    const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
            callbackUrl
        });

        setIsSubmitting(false);

        if (result?.error) {
            setError(formatError(result.error));
            return;
        }

        router.push(result?.url || callbackUrl);
    };

    return (
        <main className="login-shell">
            <div className="login-card glass-panel">
                <section className="login-brand">
                    <div className="login-badge">OpsGuard</div>
                    <h1>Command incidents.<br />Stay ahead.</h1>
                    <p>
                        A redline-ready control center for high-stakes response. See every alert, escalation, and shift before it
                        becomes a disruption.
                    </p>
                    <div className="login-features">
                        <div className="login-feature-pill">Live incident war room</div>
                        <div className="login-feature-pill">Layered schedules and overrides</div>
                        <div className="login-feature-pill">Audit-ready access controls</div>
                        <div className="login-feature-pill">Built for critical ops</div>
                        <div className="login-feature-pill">Sub-minute escalation</div>
                        <div className="login-feature-pill">Follow-the-sun coverage</div>
                    </div>
                    <div className="login-brand-footer">
                        <span>Operational intelligence</span>
                        <div className="login-brand-metrics">
                            <span>Always on</span>
                            <span>Globally resilient</span>
                        </div>
                    </div>
                </section>

                <section className="login-form">
                    <div className="login-form-header">
                        <div className="login-logo-box">
                            <img src="/logo.svg" alt="OpsGuard" className="login-logo" />
                        </div>
                        <div>
                            <div className="login-product">OpsGuard</div>
                            <div className="login-eyebrow">Secure Sign-In</div>
                        </div>
                    </div>

                    <h2 className="login-title">Welcome back</h2>
                    <p className="login-subtitle">
                        Sign in with SSO or use your OpsGuard credentials for secure access.
                    </p>

                    <button
                        type="button"
                        onClick={() => signIn('oidc', { callbackUrl })}
                        className="glass-button primary login-provider"
                    >
                        Continue with SSO
                    </button>

                    <div className="login-divider">
                        <span className="login-divider-line" />
                        <span className="login-divider-label">or</span>
                        <span className="login-divider-line" />
                    </div>

                    {passwordSet && (
                        <div className="login-alert success">
                            Password set successfully. Sign in to continue.
                        </div>
                    )}

                    <form onSubmit={handleCredentials} className="login-form-fields">
                        <div className="login-field">
                            <label>Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@company.com"
                                className="login-input"
                            />
                        </div>
                        <div className="login-field">
                            <label>Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Your password"
                                className="login-input"
                            />
                        </div>
                        {error && (
                            <div className="login-alert error">
                                {error}
                            </div>
                        )}
                        <button type="submit" className="glass-button login-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Signing in...' : 'Sign in with Email'}
                        </button>
                    </form>

                    <div className="login-help">
                        Need help? Contact your OpsGuard administrator.
                    </div>
                </section>
            </div>
        </main>
    );
}
