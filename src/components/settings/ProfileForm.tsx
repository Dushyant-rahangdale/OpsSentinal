'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile } from '@/app/(app)/settings/actions';

type Props = {
    name: string;
    email: string | null;
    role: string;
    memberSince: string;
};

type State = {
    error?: string | null;
    success?: boolean;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className="glass-button primary settings-submit" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save changes'}
        </button>
    );
}

export default function ProfileForm({ name, email, role, memberSince }: Props) {
    const [state, formAction] = useFormState<State>(updateProfile, { error: null, success: false });

    return (
        <form action={formAction} className="settings-panel">
            <div className="settings-field">
                <label>Display name</label>
                <input name="name" defaultValue={name} />
            </div>
            <div className="settings-field">
                <label>Email</label>
                <input value={email ?? 'Not available'} readOnly />
            </div>
            <div className="settings-field">
                <label>Role</label>
                <input value={role} readOnly />
            </div>
            <div className="settings-field">
                <label>Member since</label>
                <input value={memberSince} readOnly />
            </div>
            <SubmitButton />
            {state?.error ? <div className="settings-note" style={{ color: 'var(--danger)' }}>{state.error}</div> : null}
            {state?.success ? <div className="settings-note" style={{ color: 'var(--success)' }}>Profile updated.</div> : null}
        </form>
    );
}
