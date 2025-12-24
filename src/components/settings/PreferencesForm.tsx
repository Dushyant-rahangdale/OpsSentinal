'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updatePreferences } from '@/app/(app)/settings/actions';
import TimeZoneSelect from '@/components/TimeZoneSelect';

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
        <form action={formAction} className="settings-panel-modern">
            <div className="settings-panel-header">
                <h3>General Preferences</h3>
                <p>Configure your timezone and notification preferences</p>
            </div>

            <div className="settings-form">
                <div className="settings-field">
                    <label>Timezone</label>
                    <TimeZoneSelect 
                        name="timeZone" 
                        defaultValue={timeZone}
                    />
                    <p className="settings-field-hint">All times will be displayed in your selected timezone</p>
                </div>
                
                <div className="settings-field">
                    <label>Daily Summary</label>
                    <label className="settings-checkbox-label">
                        <input 
                            type="checkbox" 
                            name="dailySummary" 
                            defaultChecked={dailySummary}
                            key={dailySummary ? 'checked' : 'unchecked'}
                        />
                        <span>
                            <strong>Send daily incident summary</strong>
                            <small>Receive a daily email with a summary of all incidents</small>
                        </span>
                    </label>
                </div>
                
                <div className="settings-field">
                    <label>Incident Digest</label>
                    <select name="incidentDigest" defaultValue={incidentDigest} key={incidentDigest}>
                        <option value="HIGH">High priority only</option>
                        <option value="ALL">All incidents</option>
                        <option value="NONE">None</option>
                    </select>
                    <p className="settings-field-hint">Choose which incidents to include in your digest emails</p>
                </div>
            </div>
            
            <SubmitButton />
            
            {state?.error && (
                <div className="settings-error-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#dc2626"/>
                        <path d="M10 6V10M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>{state.error}</span>
                </div>
            )}
            
            {state?.success && (
                <div className="settings-success-banner">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#22c55e"/>
                        <path d="M7 10L9 12L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Preferences saved successfully</span>
                </div>
            )}
        </form>
    );
}
