'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SwipeableIncidentCard from '@/components/mobile/SwipeableIncidentCard';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';
import { logger } from '@/lib/logger';

type IncidentListItem = {
    id: string;
    title: string;
    status: string;
    urgency: string | null;
    createdAt: Date | string;
    service: { name: string };
};

export default function MobileIncidentList({ incidents }: { incidents: IncidentListItem[] }) {
    const router = useRouter();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleStatusUpdate = async (id: string, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
        if (updatingId) return;
        setUpdatingId(id);
        setErrorMessage('');
        try {
            await updateIncidentStatus(id, status);
            router.refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update incident';
            setErrorMessage(message);
            logger.error('mobile.incidentList.statusUpdateFailed', {
                component: 'MobileIncidentList',
                error,
                incidentId: id,
                status
            });
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="mobile-incident-list">
            {errorMessage && (
                <div className="mobile-incident-list-error">{errorMessage}</div>
            )}
            {incidents.map((incident) => (
                <SwipeableIncidentCard
                    key={incident.id}
                    incident={incident}
                    onAcknowledge={incident.status === 'OPEN' ? () => handleStatusUpdate(incident.id, 'ACKNOWLEDGED') : undefined}
                    onResolve={incident.status !== 'RESOLVED' ? () => handleStatusUpdate(incident.id, 'RESOLVED') : undefined}
                    isUpdating={updatingId === incident.id}
                />
            ))}
        </div>
    );
}
