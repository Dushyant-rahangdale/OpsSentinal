import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import StatusPageConfig from '@/components/StatusPageConfig';

export default async function StatusPageSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    try {
        await assertAdmin();
    } catch {
        redirect('/');
    }

    // Get or create status page
    let statusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
        include: {
            services: {
                include: {
                    service: true,
                },
            },
            announcements: {
                orderBy: { startDate: 'desc' },
                take: 20,
            },
        },
    });

    if (!statusPage) {
        // Create default status page
        statusPage = await prisma.statusPage.create({
            data: {
                name: 'Status Page',
                enabled: true,
            },
            include: {
                services: true,
                announcements: true,
            },
        });
    }

    // Get all services
    const allServices = await prisma.service.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div style={{ padding: 'var(--spacing-6)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-2)' }}>
                    Status Page Settings
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>
                    Configure your public status page
                </p>
            </div>

            <StatusPageConfig
                statusPage={statusPage}
                allServices={allServices}
            />
        </div>
    );
}

