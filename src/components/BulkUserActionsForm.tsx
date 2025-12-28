'use client';

import { useState, useEffect, useActionState, type CSSProperties } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

type FormState = {
    error?: string | null;
    success?: boolean;
};

type Props = {
    action: (prevState: FormState, formData: FormData) => Promise<FormState>;
    formId: string;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="glass-button bulk-actions-button" disabled={pending}>
            {pending ? 'Applying...' : 'Apply'}
        </button>
    );
}

export default function BulkUserActionsForm({ action, formId, className = '', style, disabled = false }: Props) {
    const [state, formAction] = useActionState(action, { error: null, success: false });
    const [localError, setLocalError] = useState<string | null>(null);
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            router.refresh();
        }
    }, [state?.success, router]);

    useEffect(() => {
        const actionSelect = document.getElementById(`${formId}-action`) as HTMLSelectElement;
        const roleSelect = document.getElementById(`${formId}-role`) as HTMLSelectElement;

        if (actionSelect && roleSelect) {
            const handleChange = () => {
                setShowRoleSelect(actionSelect.value === 'setRole');
                if (actionSelect.value !== 'setRole') {
                    roleSelect.value = '';
                }
            };
            actionSelect.addEventListener('change', handleChange);
            return () => actionSelect.removeEventListener('change', handleChange);
        }
    }, [formId]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        const formData = new FormData(event.currentTarget);
        const userIds = formData.getAll('userIds');
        const bulkAction = formData.get('bulkAction') as string;

        if (!bulkAction) {
            setLocalError('Choose a bulk action first.');
            event.preventDefault();
            return;
        }

        if (userIds.length === 0) {
            setLocalError('Select at least one user.');
            event.preventDefault();
            return;
        }

        if (bulkAction === 'setRole') {
            const role = formData.get('role') as string;
            if (!role) {
                setLocalError('Select a role.');
                event.preventDefault();
                return;
            }
        }

        if (bulkAction === 'delete' && !window.confirm('Delete selected users? This cannot be undone.')) {
            event.preventDefault();
            return;
        }

        setLocalError(null);
    };

    return (
        <form
            id={formId}
            action={formAction}
            onSubmit={handleSubmit}
            className={`bulk-actions-form ${className}`.trim()}
            style={{ ...style, opacity: disabled ? 0.6 : 1 }}
        >
            <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                <select name="bulkAction" defaultValue="" className="bulk-actions-select" id={`${formId}-action`}>
                    <option value="" disabled>Bulk action</option>
                    <option value="activate">Activate</option>
                    <option value="deactivate">Deactivate</option>
                    <option value="setRole">Change Role</option>
                    <option value="delete">Delete</option>
                </select>
                {showRoleSelect && (
                    <select name="role" defaultValue="" className="bulk-actions-select" id={`${formId}-role`} required>
                        <option value="" disabled>Select role</option>
                        <option value="ADMIN">Admin</option>
                        <option value="RESPONDER">Responder</option>
                        <option value="USER">User</option>
                    </select>
                )}
                <SubmitButton />
            </fieldset>
            {disabled && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                    Admin access required
                </span>
            )}
            {(localError || state?.error) ? (
                <span className="bulk-actions-error">
                    {localError || state?.error}
                </span>
            ) : null}
        </form>
    );
}
