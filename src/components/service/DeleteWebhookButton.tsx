'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    deleteAction: () => Promise<void>;
    redirectTo?: string;
};

export default function DeleteWebhookButton({ deleteAction, redirectTo }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this webhook integration?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteAction();
            if (redirectTo) {
                router.push(redirectTo);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to delete webhook:', error);
            alert('Failed to delete webhook');
            setIsDeleting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="glass-button"
            style={{
                color: 'var(--danger)',
                borderColor: 'var(--danger)',
                opacity: isDeleting ? 0.7 : 1,
                cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
        >
            {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
    );
}
