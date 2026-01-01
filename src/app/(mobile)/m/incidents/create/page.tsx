import { createIncident } from '@/app/(app)/incidents/actions';
import MobileCreateIncidentClient from './client';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MobileCreateIncidentPage() {
    const [services, users] = await Promise.all([
        prisma.service.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        }),
        prisma.user.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true }
        }),
    ]);

    return (
        <div className="mobile-dashboard">
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>New Incident</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    Report a new issue
                </p>
            </div>

            <MobileCreateIncidentClient
                services={services}
                users={users}
                createAction={createIncident}
            />
        </div>
    );
}
