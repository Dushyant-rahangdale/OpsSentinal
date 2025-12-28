'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/(app)/settings/actions';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

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
        <button className="settings-primary-button" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Changes'}
        </button>
    );
}

export default function ProfileForm({ name, email, role, memberSince }: Props) {
    const [state, formAction] = useActionState<State, FormData>(updateProfile, { error: null, success: false });
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    // Refresh the page after successful update to show the new name everywhere
    useEffect(() => {
        if (state?.success) {
            // Small delay to show success message, then refresh to update all components
            // The JWT callback will fetch the latest name from DB on next request
            const timer = setTimeout(() => {
                router.refresh();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    return (
        <form ref={formRef} action={formAction} className="settings-form-stack">
            <SettingRow
                label="Display name"
                description="This is how your name appears across the workspace."
                helpText="Changes update your display name everywhere after you save."
            >
                <input
                    key={name}
                    name="name"
                    defaultValue={name}
                    placeholder="Enter your display name"
                    required
                />
            </SettingRow>

            <SettingRow
                label="Email address"
                description="Email is managed by your identity provider."
            >
                <div className="settings-field-with-icon">
                    <input value={email ?? 'Not available'} readOnly className="settings-input-readonly" />
                    <span className="settings-field-icon lock" title="Read-only field">🔒</span>
                </div>
            </SettingRow>

            <SettingRow
                label="Role"
                description="Your workspace role determines permissions."
            >
                <div className="settings-field-with-icon">
                    <input value={role} readOnly className="settings-input-readonly" />
                    <span className="settings-field-icon lock" title="Read-only field">🔒</span>
                </div>
            </SettingRow>

            <SettingRow
                label="Member since"
                description="Date you joined this workspace."
            >
                <div className="settings-field-with-icon">
                    <input value={memberSince} readOnly className="settings-input-readonly" />
                    <span className="settings-field-icon lock" title="Read-only field">🔒</span>
                </div>
            </SettingRow>

            {(state?.error || state?.success) && (
                <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                    {state?.error ? state.error : 'Profile updated successfully'}
                </div>
            )}

            <StickyActionBar>
                <SubmitButton />
            </StickyActionBar>
        </form>
    );
}
