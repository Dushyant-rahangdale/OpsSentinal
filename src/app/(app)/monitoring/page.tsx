import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import MonitoringDashboard from '@/components/MonitoringDashboard';

export default async function MonitoringPage() {
    const session = await getServerSession(await getAuthOptions());

    if (!session?.user) {
        redirect('/login');
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
        redirect('/');
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    System Monitoring
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Database query performance and system metrics
                </p>
            </div>
            <MonitoringDashboard />
        </div>
    );
}

