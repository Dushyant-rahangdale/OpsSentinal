'use client';

import { useState, FormEvent } from 'react';
import ConfirmDialog from '../ConfirmDialog';

type DeleteIntegrationButtonProps = {
    action: (formData: FormData) => void;
    integrationName: string;
};

export default function DeleteIntegrationButton({ 
    action, 
    integrationName 
}: DeleteIntegrationButtonProps) {
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

    return (
        <>
            <form onSubmit={handleSubmit} style={{ display: 'inline' }}>
                <button 
                    type="submit"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '0px',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--danger)';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--danger)';
                    }}
                >
                    Delete
                </button>
            </form>

            <ConfirmDialog
                isOpen={showConfirm}
                title="Delete Integration"
                message={`⚠️ WARNING: Are you sure you want to delete the integration "${integrationName}"? This will stop receiving alerts from this source. This action CANNOT be undone.`}
                confirmText="Yes, Delete Integration"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleConfirm}
                onCancel={() => setShowConfirm(false)}
            />
        </>
    );
}










