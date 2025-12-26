'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import { useToast } from '@/components/ToastProvider';

type Props = {
    appUrl: string | null;
    fallback: string;
};

export default function AppUrlSettings({ appUrl, fallback }: Props) {
    const router = useRouter();
    const { showToast } = useToast();
    const [value, setValue] = useState(appUrl || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/settings/app-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appUrl: value }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update app URL');
            }

            showToast('Application URL updated successfully', 'success');
            router.refresh();
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to update app URL',
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <FormField
                        type="input"
                        inputType="url"
                        label="Application URL"
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                        placeholder={fallback}
                        helperText="The base URL for your application. Used in emails, webhooks, and RSS feeds."
                    />

                    {!value && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: '#92400e'
                        }}>
                            <strong>Using fallback:</strong> {fallback}
                            <br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                Set a custom URL here to override the default.
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                        disabled={isLoading}
                    >
                        Save URL
                    </Button>
                    {value && (
                        <button
                            type="button"
                            onClick={() => setValue('')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Clear (use fallback)
                        </button>
                    )}
                </div>
            </form>

            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#6b7280'
            }}>
                <strong style={{ color: '#374151' }}>Priority Order:</strong>
                <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.25rem' }}>
                    <li>Database configuration (this setting)</li>
                    <li>Environment variable (NEXT_PUBLIC_APP_URL)</li>
                    <li>Fallback to localhost (development only)</li>
                </ol>
            </div>
        </div>
    );
}
