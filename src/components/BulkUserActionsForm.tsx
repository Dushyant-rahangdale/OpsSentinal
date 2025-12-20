'use client';

import { useState, type CSSProperties } from 'react';
import type { FormEvent } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

type FormState = {
    error?: string | null;
    success?: boolean;
};

type Props = {
    action: (prevState: FormState, formData: FormData) => Promise<FormState>;
    formId: string;
    className?: string;
    style?: CSSProperties;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="glass-button bulk-actions-button" disabled={pending}>
            {pending ? 'Applying...' : 'Apply'}
        </button>
    );
}

export default function BulkUserActionsForm({ action, formId, className = '', style }: Props) {
    const [state, formAction] = useFormState(action, { error: null, success: false });
    const [localError, setLocalError] = useState<string | null>(null);

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
            style={style}
        >
            <select name="bulkAction" defaultValue="" className="bulk-actions-select">
                <option value="" disabled>Bulk action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
            </select>
            <SubmitButton />
            {(localError || state?.error) ? (
                <span className="bulk-actions-error">
                    {localError || state?.error}
                </span>
            ) : null}
        </form>
    );
}
