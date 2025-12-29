import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BootstrapSetupForm from '@/components/BootstrapSetupForm';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
    try {
        const totalUsers = await prisma.user.count();
        if (totalUsers > 0) {
            redirect('/login');
        }
    } catch (error) {
        // Log the error for debugging but don't crash the page
        console.error('[Setup Page] Database error:', error);

        // If it's a connection error, show a helpful message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('P1001')) {
            return (
                <main style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    background: 'radial-gradient(circle at top right, rgba(211,47,47,0.18), transparent 45%), radial-gradient(circle at bottom left, rgba(17,24,39,0.08), transparent 45%), #f8fafc'
                }}>
                    <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', background: 'white' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#dc2626' }}>Database Connection Error</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Unable to connect to the database. Please ensure:
                        </p>
                        <ul style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                            <li>The database server is running</li>
                            <li>The DATABASE_URL environment variable is correctly configured</li>
                            <li>If using Docker Compose, run: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>docker-compose up -d OpsSentinal-db</code></li>
                        </ul>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            Error: {errorMessage}
                        </p>
                    </div>
                </main>
            );
        }

        // For other errors, re-throw to show the default error page
        throw error;
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
            <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', background: 'white' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>Bootstrapping OpsSentinal</h1>
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '0.75rem',
                    borderLeft: '4px solid #f59e0b',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontSize: '0.9rem',
                    borderRadius: '0 4px 4px 0'
                }}>
                    <strong>Important:</strong> Please change this password immediately after your first login to secure your account.
                </div>
                <BootstrapSetupForm />
                <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                    <Link href="/api/auth/signout?callbackUrl=/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </main>
    );
}


