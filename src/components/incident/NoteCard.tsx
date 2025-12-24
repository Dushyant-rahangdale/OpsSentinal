'use client';

import { memo, useMemo } from 'react';
import { formatDateFriendly } from '@/lib/date-format';

type NoteCardProps = {
    content: string;
    userName: string;
    createdAt: Date;
    isResolution?: boolean;
};

function NoteCard({ content, userName, createdAt, isResolution = false }: NoteCardProps) {
    // Memoize markdown formatting to avoid recalculation
    const formattedContent = useMemo(() => {
        const formatMarkdown = (input: string) => {
            let output = input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            
            output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
            output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            output = output.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
            output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
            output = output.replace(/\n/g, '<br />');
            
            return { __html: output };
        };

        const displayContent = isResolution && content.startsWith('Resolution:') 
            ? content.replace(/^Resolution:\s*/i, '')
            : content;
        
        return formatMarkdown(displayContent);
    }, [content, isResolution]);

    return (
        <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '0px',
                background: isResolution 
                    ? 'linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)'
                    : 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: isResolution ? '#b45309' : '#1f2937',
                border: isResolution ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                flexShrink: 0
            }}>
                {userName.charAt(0).toUpperCase()}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</span>
                        {isResolution && (
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#b45309',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '0px'
                            }}>
                                Resolution
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDateFriendly(createdAt)}
                    </span>
                </div>
                <div
                    style={{
                        background: isResolution
                            ? 'linear-gradient(180deg, #fff7ed 0%, #fff3e0 100%)'
                            : '#ffffff',
                        padding: '1rem',
                        borderRadius: '0px',
                        border: isResolution ? '1px solid #fed7aa' : '1px solid var(--border)',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)'
                    }}
                    dangerouslySetInnerHTML={formattedContent}
                />
            </div>
        </div>
    );
}

// Memoize NoteCard to prevent unnecessary re-renders in note lists
export default memo(NoteCard);



