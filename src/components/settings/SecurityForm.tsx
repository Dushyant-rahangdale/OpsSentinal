'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updatePassword } from '@/app/(app)/settings/actions';

type Props = {
    hasPassword: boolean;
};

type State = {
    error?: string | null;
    success?: boolean;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className="glass-button primary settings-submit" type="submit" disabled={pending}>
            {pending ? 'Updating...' : 'Update password'}
        </button>
    );
}

export default function SecurityForm({ hasPassword }: Props) {
    const [state, formAction] = useFormState<State>(updatePassword, { error: null, success: false });

    return (
        <form action={formAction} className="settings-panel">
            {hasPassword && (
                <div className="settings-field">
                    <label>Current password</label>
                    <input type="password" name="currentPassword" autoComplete="current-password" required />
                </div>
            )}
            <div className="settings-field">
                <label>New password</label>
                <input type="password" name="newPassword" autoComplete="new-password" required />
            </div>
            <div className="settings-field">
                <label>Confirm new password</label>
                <input type="password" name="confirmPassword" autoComplete="new-password" required />
            </div>
            <SubmitButton />
            {state?.error ? <div className="settings-note" style={{ color: 'var(--danger)' }}>{state.error}</div> : null}
            {state?.success ? <div className="settings-note" style={{ color: 'var(--success)' }}>Password updated.</div> : null}
        </form>
    );
}
