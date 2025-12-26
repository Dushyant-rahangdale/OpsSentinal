'use client';

import { useState, useTransition } from 'react';
import { Button, FormField } from '@/components/ui';

interface StatusPageSubscribeProps {
    statusPageId: string;
    onSuccess?: () => void;
}

export default function StatusPageSubscribe({ statusPageId, onSuccess }: StatusPageSubscribeProps) {
    const [email, setEmail] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch('/api/status-page/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        statusPageId,
                        email: email.trim(),
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to subscribe');
                }

                setSuccess(true);
                setEmail('');
                if (onSuccess) {
                    onSuccess();
                }
            } catch (err: any) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                setError(getUserFriendlyError(err) || 'Failed to subscribe');
            }
        });
    };

    if (success) {
        return (
            <div style={{
                padding: 'var(--spacing-4)',
                background: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: '#166534', marginBottom: 'var(--spacing-2)' }}>
                    ✓ Successfully Subscribed!
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: '#15803d' }}>
                    Please check your email to verify your subscription.
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <FormField
                type="input"
                inputType="email"
                label="Subscribe to Updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                helperText="Get notified when incidents occur or status changes"
                required
            />
            {error && (
                <div style={{ padding: 'var(--spacing-2)', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: 'var(--font-size-sm)' }}>
                    {error}
                </div>
            )}
            <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                fullWidth
            >
                Subscribe
            </Button>
        </form>
    );
}

