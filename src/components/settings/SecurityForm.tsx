'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { updatePassword } from '@/app/(app)/settings/actions';
import PasswordStrength from './PasswordStrength';

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
            {pending ? 'Updating...' : 'Update Password'}
        </button>
    );
}

export default function SecurityForm({ hasPassword }: Props) {
    const [state, formAction] = useActionState<State, FormData>(updatePassword, { error: null, success: false });
    const [newPassword, setNewPassword] = useState('');
    const router = useRouter();
    const formRef = useState<HTMLFormElement | null>(null)[0];

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
        <form action={formAction} className="settings-panel-modern">
            <div className="settings-panel-header">
                <h3>Change Password</h3>
                <p>Update your account password to keep your account secure</p>
            </div>

            {hasPassword && (
                <div className="settings-field">
                    <label>Current Password</label>
                    <input
                        type="password"
                        name="currentPassword"
                        autoComplete="current-password"
                        required
                        placeholder="Enter your current password"
                    />
                </div>
            )}

            <div className="settings-field">
                <label>New Password</label>
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
                <p className="settings-field-hint">
                    Must be at least 8 characters long. Use a mix of letters, numbers, and symbols for better security.
                </p>
            </div>

            <div className="settings-field">
                <label>Confirm New Password</label>
                <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your new password"
                />
            </div>

            <SubmitButton />

            {state?.error && (
                <div className="settings-error-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#dc2626" />
                        <path d="M10 6V10M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>{state.error}</span>
                </div>
            )}

            {state?.success && (
                <div className="settings-success-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#22c55e" />
                        <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Password updated successfully</span>
                </div>
            )}
        </form>
    );
}
