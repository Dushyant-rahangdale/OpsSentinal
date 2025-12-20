import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BootstrapSetupForm from '@/components/BootstrapSetupForm';

export default async function SetupPage() {
    const totalUsers = await prisma.user.count();
    if (totalUsers > 0) {
        redirect('/login');
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
