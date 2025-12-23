'use client';

import { useState } from 'react';

export default function LayerHelpPanel() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Open help panel about layers"
                aria-expanded={isOpen ? 'true' : 'false'}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                }}
            >
                <span aria-hidden="true">ℹ️</span>
                <span>What are Layers?</span>
            </button>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            marginBottom: '1.5rem'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
            }}>
                <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#78350f',
                    margin: 0
                }}>
                    Understanding Layers
                </h4>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close help panel"
                        style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: '#78350f',
                        padding: 0,
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ×
                </button>
            </div>
            <div style={{ color: '#78350f', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: '500' }}>
                    <strong>Layers</strong> allow you to run multiple rotation patterns simultaneously.
                </p>
                <div style={{ marginBottom: '0.75rem' }}>
                    <strong>Example:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li><strong>Day Layer:</strong> 6 AM - 6 PM, rotates every 12 hours</li>
                        <li><strong>Night Layer:</strong> 6 PM - 6 AM, rotates every 12 hours</li>
                    </ul>
                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Together, these provide 24/7 coverage with different teams for day and night shifts.
                    </p>
                </div>
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '6px',
                    marginTop: '0.75rem'
                }}>
                    <strong>Key Points:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>Each layer rotates through its assigned responders</li>
                        <li>Multiple layers can be active at the same time</li>
                        <li>Layers are independent - they don't affect each other</li>
                        <li>Use layers to create complex schedules (follow-the-sun, tiered support, etc.)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}




