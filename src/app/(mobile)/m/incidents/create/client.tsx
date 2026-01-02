'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileButton from '@/components/mobile/MobileButton';

type Service = { id: string; name: string };
type User = { id: string; name: string | null; email: string };

export default function MobileCreateIncidentClient({
    services,
    users,
    createAction,
}: {
    services: Service[];
    users: User[];
    createAction: (formData: FormData) => Promise<any>;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultServiceId = searchParams.get('serviceId') || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [urgency, setUrgency] = useState<'HIGH' | 'LOW'>('LOW');

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError('');

        try {
            const result = await createAction(formData);
            if (result && result.id) {
                // Ensure we redirect to the MOBILE view
                router.push(`/m/incidents/${result.id}`);
            } else {
                // Fallback if no ID returned (shouldn't happen)
                router.push('/m/incidents');
            }
        } catch (err: any) {
            // We removed the server-side redirect, so NEXT_REDIRECT shouldn't happen,
            // but keeping this check doesn't hurt.
            if (err.message === 'NEXT_REDIRECT' || err.digest?.startsWith('NEXT_REDIRECT')) {
                throw err;
            }
            setError(err.message || 'Failed to create incident');
            setLoading(false);
        }
    }

    // Helper to truncate long names for mobile dropdowns
    const truncate = (str: string | null, len: number) => {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    };

    const submitButtonStyle = urgency === 'LOW'
        ? { background: '#ca8a04', borderColor: '#ca8a04', color: 'white' }
        : { background: '#dc2626', borderColor: '#dc2626', color: 'white' };

    return (
        <form action={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Title <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                        name="title"
                        required
                        placeholder="e.g. API Gateway High Latency"
                        style={{
                            padding: '0.875rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem',
                            width: '100%',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                        }}
                    />
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Description
                    </label>
                    <textarea
                        name="description"
                        rows={4}
                        placeholder="What's happening? Add context..."
                        style={{
                            padding: '0.875rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            fontSize: '0.95rem',
                            width: '100%',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            resize: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                </div>

                {/* Service */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Service <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            name="serviceId"
                            required
                            defaultValue={defaultServiceId}
                            style={{
                                appearance: 'none',
                                padding: '0.875rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                fontSize: '0.95rem',
                                width: '100%',
                                maxWidth: '100%',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                paddingRight: '2.5rem',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="" disabled>Select a service</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{truncate(s.name, 25)}</option>
                            ))}
                        </select>
                        <div style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Urgency */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Urgency
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <UrgencyRadio
                            name="urgency"
                            value="HIGH"
                            label="High"
                            checked={urgency === 'HIGH'}
                            onChange={() => setUrgency('HIGH')}
                        />
                        <UrgencyRadio
                            name="urgency"
                            value="LOW"
                            label="Low"
                            checked={urgency === 'LOW'}
                            onChange={() => setUrgency('LOW')}
                        />
                    </div>
                </div>

                {/* Assignee */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        Assignee (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <select
                            name="assigneeId"
                            style={{
                                appearance: 'none',
                                padding: '0.875rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                fontSize: '0.95rem',
                                width: '100%',
                                maxWidth: '100%',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                paddingRight: '2.5rem',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{truncate(u.name || u.email, 25)}</option>
                            ))}
                        </select>
                        <div style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'var(--badge-error-bg)',
                        color: 'var(--badge-error-text)',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <MobileButton
                        type="button"
                        variant="secondary"
                        style={{ flex: 1 }}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </MobileButton>
                    <MobileButton
                        type="submit"
                        variant="primary"
                        style={{ flex: 1, ...submitButtonStyle }}
                        loading={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Incident'}
                    </MobileButton>
                </div>
            </div>
        </form>
    );
}

function UrgencyRadio({
    name,
    value,
    label,
    checked,
    onChange
}: {
    name: string;
    value: string;
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="mobile-urgency-radio" data-value={value}>
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={onChange}
            />
            <span className="mobile-urgency-label">{label}</span>
        </label>
    );
}

