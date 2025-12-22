'use client';

import { useState, useTransition } from 'react';

interface StatusPageSubscribeProps {
    statusPage: {
        id: string;
    };
    branding?: any;
}

export default function StatusPageSubscribe({ statusPage, branding = {} }: StatusPageSubscribeProps) {
    const primaryColor = branding.primaryColor || '#667eea';
    const subscriptionText = branding.subscriptionText || 'Subscribe to Updates';
    const [email, setEmail] = useState('');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        startTransition(async () => {
            try {
                const response = await fetch('/api/status/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, statusPageId: statusPage.id }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to subscribe');
                }

                setMessage({ type: 'success', text: 'Successfully subscribed! You will receive email updates.' });
                setEmail('');
            } catch (error: any) {
                setMessage({ type: 'error', text: error.message || 'Failed to subscribe. Please try again.' });
            }
        });
    };

    return (
        <section style={{ 
            marginBottom: '3rem',
            padding: '2.5rem',
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
            borderRadius: '1rem',
            color: 'white',
            boxShadow: `0 8px 32px ${primaryColor}40`,
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    marginBottom: '0.5rem',
                }}>
                    {subscriptionText}
                </h2>
                <p style={{ 
                    fontSize: '0.95rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.9,
                }}>
                    Get notified when incidents occur or are resolved
                </p>
                <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        disabled={isPending}
                        style={{
                            flex: '1',
                            minWidth: '200px',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontSize: '0.95rem',
                            background: 'white',
                            color: '#111827',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'white',
                            color: '#667eea',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            opacity: isPending ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (!isPending) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isPending ? 'Subscribing...' : 'Subscribe'}
                    </button>
                </form>
                {message && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                    }}>
                        {message.text}
                    </div>
                )}
            </div>
        </section>
    );
}

