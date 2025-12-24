'use client';

import { useState, FormEvent } from 'react';
import ConfirmDialog from '../ConfirmDialog';

type DeleteServiceButtonProps = {
    action: (formData: FormData) => void;
    serviceName: string;
    incidentCount: number;
    hasOpenIncidents: boolean;
};

export default function DeleteServiceButton({ 
    action, 
    serviceName, 
    incidentCount,
    hasOpenIncidents 
}: DeleteServiceButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        const formData = new FormData();
        action(formData);
        setShowConfirm(false);
    };

    const warningMessage = hasOpenIncidents
        ? `⚠️ WARNING: This service has ${incidentCount} incident(s), including open incidents. Deleting this service will permanently remove all associated incidents, integrations, and alerts. This action CANNOT be undone.`
        : incidentCount > 0
        ? `⚠️ WARNING: This service has ${incidentCount} incident(s). Deleting this service will permanently remove all associated incidents, integrations, and alerts. This action CANNOT be undone.`
        : `⚠️ WARNING: Are you sure you want to delete "${serviceName}"? This will permanently remove the service and all associated integrations and alerts. This action CANNOT be undone.`;

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: 'inline' }}>
                <button 
                    type="submit"
                    className="glass-button"
                    style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--danger)',
                        color: 'white',
                        border: 'none'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                </button>
            </form>

            <ConfirmDialog
                isOpen={showConfirm}
                title="Delete Service"
                message={warningMessage}
                confirmText="Yes, Delete Service"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setShowConfirm(false)}
            />
        </>
    );
}










