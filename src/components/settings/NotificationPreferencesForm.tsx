'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateNotificationPreferences } from '@/app/(app)/settings/actions';
import { SettingsRow } from '@/components/settings/layout/SettingsRow';
import { Switch } from '@/components/ui/shadcn/switch';
import { Input } from '@/components/ui/shadcn/input';
import { Button } from '@/components/ui/shadcn/button';
import { Label } from '@/components/ui/shadcn/label';

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

export default function NotificationPreferencesForm({
    emailEnabled,
    smsEnabled,
    pushEnabled,
    whatsappEnabled,
    phoneNumber
}: Props) {
    const [state, formAction, isPending] = useActionState<State, FormData>(updateNotificationPreferences, { error: null, success: false });
    const [emailChecked, setEmailChecked] = useState(emailEnabled);
    const [smsChecked, setSmsChecked] = useState(smsEnabled);
    const [pushChecked, setPushChecked] = useState(pushEnabled);
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
        <form action={formAction} className="space-y-1">
            {/* Hidden inputs to submit switch values */}
            <input type="hidden" name="emailNotificationsEnabled" value={emailChecked ? 'true' : 'false'} />
            <input type="hidden" name="smsNotificationsEnabled" value={smsChecked ? 'true' : 'false'} />
            <input type="hidden" name="pushNotificationsEnabled" value={pushChecked ? 'true' : 'false'} />
            <input type="hidden" name="whatsappNotificationsEnabled" value={whatsappChecked ? 'true' : 'false'} />

            <SettingsRow
                label="Email notifications"
                description="Receive incident alerts via email."
            >
                <div className="flex items-center gap-3">
                    <Switch
                        id="email-switch"
                        checked={emailChecked}
                        onCheckedChange={setEmailChecked}
                    />
                    <Label htmlFor="email-switch" className="text-sm">
                        {emailChecked ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
            </SettingsRow>

            <SettingsRow
                label="SMS notifications"
                description="Receive incident alerts via SMS. Requires phone number."
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Switch
                            id="sms-switch"
                            checked={smsChecked}
                            onCheckedChange={setSmsChecked}
                        />
                        <Label htmlFor="sms-switch" className="text-sm">
                            {smsChecked ? 'Enabled' : 'Disabled'}
                        </Label>
                    </div>
                    {smsChecked && (
                        <Input
                            type="tel"
                            name="phoneNumber"
                            placeholder="+1234567890"
                            defaultValue={phoneNumber || ''}
                            required={smsChecked}
                            className="max-w-xs"
                        />
                    )}
                </div>
            </SettingsRow>

            <SettingsRow
                label="Push notifications"
                description="Send mobile push notifications. Requires provider configuration."
            >
                <div className="flex items-center gap-3">
                    <Switch
                        id="push-switch"
                        checked={pushChecked}
                        onCheckedChange={setPushChecked}
                    />
                    <Label htmlFor="push-switch" className="text-sm">
                        {pushChecked ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
            </SettingsRow>

            <SettingsRow
                label="WhatsApp notifications"
                description="Receive incident alerts via WhatsApp."
                tooltip="Enter phone number in E.164 format (e.g., +1234567890)."
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Switch
                            id="whatsapp-switch"
                            checked={whatsappChecked}
                            onCheckedChange={setWhatsappChecked}
                        />
                        <Label htmlFor="whatsapp-switch" className="text-sm">
                            {whatsappChecked ? 'Enabled' : 'Disabled'}
                        </Label>
                    </div>
                    {whatsappChecked && (
                        <Input
                            type="tel"
                            name="phoneNumberWhatsApp"
                            placeholder="+1234567890"
                            defaultValue={phoneNumber || ''}
                            required={whatsappChecked}
                            className="max-w-xs"
                        />
                    )}
                </div>
            </SettingsRow>

            {(state?.error || state?.success) && (
                <div className={`p-3 rounded-lg text-sm ${state?.error ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                    {state?.error ? state.error : 'Notification preferences saved successfully'}
                </div>
            )}

            <div className="pt-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Notification Preferences'}
                </Button>
            </div>
        </form>
    );
}
