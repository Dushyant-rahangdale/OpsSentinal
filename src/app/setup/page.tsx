import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
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
                            <li>If using Docker Compose, run: <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>docker-compose up -d opsguard-db</code></li>
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
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>Bootstrapping OpsGuard</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Create the initial admin account. Once you’ve signed in you can invite other users and delete this temporary admin for security.
                </p>
                <BootstrapSetupForm />
            </div>
        </main>
    );
}
