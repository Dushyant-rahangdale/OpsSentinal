import prisma from '@/lib/prisma';
import { setPassword } from './actions';

type SearchParams = {
    token?: string;
    error?: string;
};

function errorMessage(code?: string) {
    if (!code) return '';
    if (code === 'missing') return 'Invite token missing.';
    if (code === 'weak') return 'Password must be at least 10 characters.';
    if (code === 'complexity') return 'Password must include upper, lower, and numeric characters.';
    if (code === 'mismatch') return 'Passwords do not match.';
    if (code === 'expired') return 'This invite link has expired.';
    if (code === 'invalid') return 'Invalid invite link.';
    return 'Unable to set password.';
}

export default async function SetPasswordPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    const awaitedSearchParams = await searchParams;
    const token = typeof awaitedSearchParams?.token === 'string' ? awaitedSearchParams.token : '';
    const error = typeof awaitedSearchParams?.error === 'string' ? awaitedSearchParams.error : '';

    if (!token) {
        return (
            <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', background: 'white' }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Set password</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Missing invite token. Ask your admin for a new link.</p>
                </div>
            </main>
        );
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });
    const isExpired = record ? record.expires < new Date() : true;
    const userEmail = record?.identifier || '';

    if (!record || isExpired) {
        return (
            <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', background: 'white' }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Invite expired</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>This invite link is invalid or expired. Ask your admin for a new one.</p>
                </div>
            </main>
        );
    }

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'radial-gradient(circle at top right, rgba(211,47,47,0.18), transparent 45%), radial-gradient(circle at bottom left, rgba(17,24,39,0.08), transparent 45%), #f8fafc'
        }}>
            <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem', background: 'white' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.35rem' }}>Set your password</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Create a password for <strong>{userEmail}</strong>.
                </p>

                <form action={setPassword} style={{ display: 'grid', gap: '0.9rem' }}>
                    <input type="hidden" name="token" value={token} />
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                            New password
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={10}
                            placeholder="At least 10 characters"
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: '#fff'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                            Confirm password
                        </label>
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={10}
                            placeholder="Repeat password"
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: '#fff'
                            }}
                        />
                    </div>
                    {error ? (
                        <div style={{
                            padding: '0.65rem',
                            borderRadius: '8px',
                            background: '#fef2f2',
                            color: 'var(--danger)',
                            fontSize: '0.85rem'
                        }}>
                            {errorMessage(error)}
                        </div>
                    ) : null}
                    <button type="submit" className="glass-button primary" style={{ justifyContent: 'center' }}>
                        Set password
                    </button>
                </form>
            </div>
        </main>
    );
}
