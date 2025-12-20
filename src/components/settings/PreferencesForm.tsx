'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updatePreferences } from '@/app/(app)/settings/actions';

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
        <button className="glass-button primary settings-submit" type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save preferences'}
        </button>
    );
}

export default function PreferencesForm({ timeZone, dailySummary, incidentDigest }: Props) {
    const [state, formAction] = useFormState<State>(updatePreferences, { error: null, success: false });

    return (
        <form action={formAction} className="settings-panel">
            <div className="settings-field">
                <label>Timezone</label>
                <select name="timeZone" defaultValue={timeZone}>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                </select>
            </div>
            <div className="settings-field">
                <label>Daily summary</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    <input type="checkbox" name="dailySummary" defaultChecked={dailySummary} />
                    Send daily incident summary
                </label>
            </div>
            <div className="settings-field">
                <label>Incident digest</label>
                <select name="incidentDigest" defaultValue={incidentDigest}>
                    <option value="HIGH">High priority only</option>
                    <option value="ALL">All incidents</option>
                    <option value="NONE">None</option>
                </select>
            </div>
            <SubmitButton />
            {state?.error ? <div className="settings-note" style={{ color: 'var(--danger)' }}>{state.error}</div> : null}
            {state?.success ? <div className="settings-note" style={{ color: 'var(--success)' }}>Preferences saved.</div> : null}
        </form>
    );
}
