'use client';

import { useState } from 'react';

type CopyButtonProps = {
    text: string;
};

export default function CopyButton({ text }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            style={{
                padding: '0.5rem 0.75rem',
                background: copied ? 'var(--success)' : 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '0px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s'
            }}
        >
            {copied ? '✓ Copied' : 'Copy'}
        </button>
    );
}










