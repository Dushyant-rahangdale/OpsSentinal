'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import TimeZoneSelect from './TimeZoneSelect';

type ScheduleEditFormProps = {
    scheduleId: string;
    currentName: string;
    currentTimeZone: string;
    updateSchedule: (scheduleId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    canManageSchedules: boolean;
};

export default function ScheduleEditForm({
    scheduleId,
    currentName,
    currentTimeZone,
    updateSchedule,
    canManageSchedules
}: ScheduleEditFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateSchedule(scheduleId, formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Schedule updated successfully', 'success');
                setIsEditing(false);
                router.refresh();
            }
        });
    };

    if (!canManageSchedules) {
        return null;
    }

    if (!isEditing) {
        return (
            <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="glass-button"
                style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    marginTop: '0.5rem'
                }}
            >
                Edit Schedule Settings
            </button>
        );
    }

    return (
        <form
            action={handleSubmit}
            style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
            }}
        >
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Schedule Name
                    </label>
                    <input
                        name="name"
                        defaultValue={currentName}
                        required
                        disabled={isPending}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            background: 'white'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Time Zone
                    </label>
                    <TimeZoneSelect
                        name="timeZone"
                        defaultValue={currentTimeZone}
                        disabled={isPending}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        All times in this schedule will be displayed in the selected timezone
                    </p>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    type="submit"
                    disabled={isPending}
                    className="glass-button primary"
                    style={{ flex: 1 }}
                >
                    {isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isPending}
                    className="glass-button"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

