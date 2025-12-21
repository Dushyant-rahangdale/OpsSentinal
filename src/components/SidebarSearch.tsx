'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SearchResult = {
    type: 'incident' | 'service' | 'team' | 'user' | 'policy';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
};

export default function SidebarSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
            }
            // Arrow keys to navigate results
            if (isOpen && results.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    router.push(results[selectedIndex].href);
                    setIsOpen(false);
                    setQuery('');
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, router]);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setSelectedIndex(-1);
            return;
        }

        // Debounce search
        const timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.results || []);
                    setSelectedIndex(-1);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleResultClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    width: '100%',
                    padding: '0.625rem 1rem',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0px',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>Search...</span>
                <kbd style={{
                    padding: '2px 6px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '2px',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)'
                }}>⌘K</kbd>
            </button>
        );
    }

    return (
        <div style={{
            position: 'relative',
            width: '100%'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 1rem',
                background: 'white',
                border: '1px solid var(--primary)',
                borderRadius: '0px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search incidents, services, teams..."
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit'
                    }}
                    autoFocus
                />
                <button
                    onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {query.length >= 2 && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9998
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        borderRadius: '0px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 9999,
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                    {results.length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem'
                        }}>
                            No results found for "{query}"
                        </div>
                    ) : (
                        results.map((result, index) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result.href)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: selectedIndex === index ? '#f3f4f6' : 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.15s',
                                    borderBottom: index < results.length - 1 ? '1px solid #e5e7eb' : 'none'
                                }}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '0px',
                                    background: getTypeColor(result.type),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {getTypeIcon(result.type)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-primary)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {result.title}
                                    </div>
                                    {result.subtitle && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {result.subtitle}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    fontWeight: '600'
                                }}>
                                    {result.type}
                                </div>
                            </button>
                        ))
                    )}
                    </div>
                </>
            )}
        </div>
    );
}

function getTypeColor(type: SearchResult['type']): string {
    const colors = {
        incident: '#fee2e2',
        service: '#dbeafe',
        team: '#f3e8ff',
        user: '#ecfdf5',
        policy: '#fef3c7'
    };
    return colors[type];
}

function getTypeIcon(type: SearchResult['type']): React.ReactNode {
    const icons = {
        incident: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        ),
        service: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#2563eb">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        ),
        team: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#7c3aed">
                <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
            </svg>
        ),
        user: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#059669">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z" />
            </svg>
        ),
        policy: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#d97706">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
            </svg>
        )
    };
    return icons[type];
}

