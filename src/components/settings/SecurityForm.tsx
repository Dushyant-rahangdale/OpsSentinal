'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { signOut } from 'next-auth/react';
import { updatePassword } from '@/app/(app)/settings/actions';
import PasswordStrength from './PasswordStrength';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

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
        <button className="settings-primary-button" type="submit" disabled={pending}>
            {pending ? 'Updating...' : 'Update Password'}
        </button>
    );
}

export default function SecurityForm({ hasPassword }: Props) {
    const [state, formAction] = useActionState<State, FormData>(updatePassword, { error: null, success: false });
    const [newPassword, setNewPassword] = useState('');

    // Clear form and sign out after successful update
    useEffect(() => {
        if (state?.success) {
            setNewPassword('');
            const timer = setTimeout(async () => {
                await signOut({ callbackUrl: '/login' });
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [state?.success]);

    return (
        <form action={formAction} className="settings-form-stack">
            {hasPassword && (
                <SettingRow
                    label="Current password"
                    description="Confirm your current password to proceed."
                >
                    <input
                        type="password"
                        name="currentPassword"
                        autoComplete="current-password"
                        required
                        placeholder="Enter your current password"
                    />
                </SettingRow>
            )}

            <SettingRow
                label="New password"
                description="Use a strong password with letters, numbers, and symbols."
                helpText="Must be at least 8 characters long."
            >
                <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    required
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <PasswordStrength password={newPassword} />
            </SettingRow>

            <SettingRow
                label="Confirm new password"
                description="Re-enter the new password to confirm."
            >
                <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your new password"
                />
            </SettingRow>

            {(state?.error || state?.success) && (
                <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                    {state?.error ? state.error : 'Password updated successfully'}
                </div>
            )}

            <StickyActionBar>
                <SubmitButton />
            </StickyActionBar>
        </form>
    );
}
