'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateNotificationPreferences } from '@/app/(app)/settings/actions';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

type State = {
    error?: string | null;
    success?: boolean;
};

type Props = {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    whatsappEnabled: boolean;
    phoneNumber: string | null;
};

function SubmitButton({ pending }: { pending: boolean }) {
    return (
        <button
            type="submit"
            disabled={pending}
            className="settings-primary-button"
        >
            {pending ? 'Saving...' : 'Save Notification Preferences'}
        </button>
    );
}

export default function NotificationPreferencesForm({
    emailEnabled,
    smsEnabled,
    pushEnabled,
    whatsappEnabled,
    phoneNumber
}: Props) {
    const [state, formAction, isPending] = useActionState<State, FormData>(updateNotificationPreferences, { error: null, success: false });
    const [smsChecked, setSmsChecked] = useState(smsEnabled);
    const [whatsappChecked, setWhatsappChecked] = useState(whatsappEnabled);
    const router = useRouter();

    // Refresh the page after successful update
    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                router.refresh();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    return (
        <form action={formAction} className="settings-form-stack">
            <SettingRow
                label="Email notifications"
                description="Receive incident alerts via email."
            >
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        name="emailNotificationsEnabled"
                        defaultChecked={emailEnabled}
                        key={emailEnabled ? 'email-checked' : 'email-unchecked'}
                    />
                    <span>Email alerts</span>
                </label>
            </SettingRow>

            <SettingRow
                label="SMS notifications"
                description="Receive incident alerts via SMS. Requires phone number."
            >
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        name="smsNotificationsEnabled"
                        defaultChecked={smsEnabled}
                        onChange={(e) => setSmsChecked(e.target.checked)}
                        key={smsEnabled ? 'sms-checked' : 'sms-unchecked'}
                    />
                    <span>SMS alerts</span>
                </label>
                {smsChecked && (
                    <input
                        type="tel"
                        name="phoneNumber"
                        placeholder="+1234567890"
                        defaultValue={phoneNumber || ''}
                        required={smsChecked}
                    />
                )}
            </SettingRow>

            <SettingRow
                label="Push notifications"
                description="Send mobile push notifications. Requires provider configuration."
            >
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        name="pushNotificationsEnabled"
                        defaultChecked={pushEnabled}
                        key={pushEnabled ? 'push-checked' : 'push-unchecked'}
                    />
                    <span>Push alerts</span>
                </label>
            </SettingRow>

            <SettingRow
                label="WhatsApp notifications"
                description="Receive incident alerts via WhatsApp."
                helpText="Enter phone number in E.164 format (e.g., +1234567890)."
            >
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        name="whatsappNotificationsEnabled"
                        defaultChecked={whatsappEnabled}
                        onChange={(e) => setWhatsappChecked(e.target.checked)}
                        key={whatsappEnabled ? 'whatsapp-checked' : 'whatsapp-unchecked'}
                    />
                    <span>WhatsApp alerts</span>
                </label>
                {whatsappChecked && (
                    <input
                        type="tel"
                        name="phoneNumberWhatsApp"
                        placeholder="+1234567890"
                        defaultValue={phoneNumber || ''}
                        required={whatsappChecked}
                    />
                )}
            </SettingRow>

            {(state?.error || state?.success) && (
                <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                    {state?.error ? state.error : 'Notification preferences saved successfully'}
                </div>
            )}

            <StickyActionBar>
                <SubmitButton pending={isPending} />
            </StickyActionBar>
        </form>
    );
}
