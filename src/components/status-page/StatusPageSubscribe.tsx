'use client';

import { useState, useTransition } from 'react';

interface StatusPageSubscribeProps {
    statusPageId: string;
    onSuccess?: () => void;
}

function getApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object' || !('error' in payload)) return null;
    const message = (payload as { error?: unknown }).error;
    return typeof message === 'string' && message.trim() ? message : null;
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
                    // The API response contract owns the public error message. Do not
                    // re-wrap it as an arbitrary Error because unmatched exception
                    // messages are intentionally treated as untrusted by AppError.
                    let message = 'Failed to subscribe';
                    try {
                        message = getApiErrorMessage(await response.json()) ?? message;
                    } catch {
                        // Malformed/non-JSON error responses fall back to generic copy.
                    }
                    setError(message);
                    return;
                }

                setSuccess(true);
                setEmail('');
                if (onSuccess) {
                    onSuccess();
                }
            } catch (err: unknown) {
                const { getUserFacingErrorMessage } = await import('@/lib/user-facing-error');
                setError(getUserFacingErrorMessage(err) || 'Failed to subscribe');
            }
        });
    };

    if (success) {
        return (
            <div className="status-subscribe__success" role="status">
                <strong>
                    ✓ Successfully Subscribed!
                </strong>
                <span>
                    Please check your email to verify your subscription.
                </span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="status-subscribe">
            <div className="status-subscribe__copy">
                <strong>Never miss a service update</strong>
                <span>Get notified when incidents occur or service status changes.</span>
            </div>
            <div className="status-subscribe__controls">
              <label className="sr-only" htmlFor={`status-subscribe-email-${statusPageId}`}>Email address</label>
              <input
                id={`status-subscribe-email-${statusPageId}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="status-subscribe__input"
                autoComplete="email"
                required
              />
              <button type="submit" className="status-subscribe__button" disabled={isPending}>
                {isPending ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
            {error && (
                <div className="status-subscribe__error" role="alert">
                    {error}
                </div>
            )}
        </form>
    );
}
