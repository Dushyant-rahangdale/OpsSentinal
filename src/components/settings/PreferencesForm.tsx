'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updatePreferences } from '@/app/(app)/settings/actions';
import TimeZoneSelect from '@/components/TimeZoneSelect';
import SettingRow from '@/components/settings/SettingRow';
import StickyActionBar from '@/components/settings/StickyActionBar';

type Props = {
    timeZone: string;
    dailySummary: boolean;
    incidentDigest: string;
};

type State = {
    error?: string | null;
    success?: boolean;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className="settings-primary-button" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Preferences'}
        </button>
    );
}

export default function PreferencesForm({ timeZone, dailySummary, incidentDigest }: Props) {
    const [state, formAction] = useActionState<State, FormData>(updatePreferences, { error: null, success: false });
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
                label="Timezone"
                description="All times are displayed in your selected timezone."
            >
                <TimeZoneSelect name="timeZone" defaultValue={timeZone} />
            </SettingRow>

            <SettingRow
                label="Daily summary"
                description="Receive a daily email summary of incidents."
            >
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        name="dailySummary"
                        defaultChecked={dailySummary}
                        key={dailySummary ? 'checked' : 'unchecked'}
                    />
                    <span>Send daily incident summary</span>
                </label>
            </SettingRow>

            <SettingRow
                label="Incident digest"
                description="Choose which incidents to include in digest emails."
            >
                <select name="incidentDigest" defaultValue={incidentDigest} key={incidentDigest}>
                    <option value="HIGH">High priority only</option>
                    <option value="ALL">All incidents</option>
                    <option value="NONE">None</option>
                </select>
            </SettingRow>

            {(state?.error || state?.success) && (
                <div className={`settings-alert ${state?.error ? 'error' : 'success'}`}>
                    {state?.error ? state.error : 'Preferences saved successfully'}
                </div>
            )}

            <StickyActionBar>
                <SubmitButton />
            </StickyActionBar>
        </form>
    );
}
