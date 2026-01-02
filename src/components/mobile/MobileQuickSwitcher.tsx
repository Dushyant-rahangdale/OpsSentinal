'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import MobileSearch from '@/components/mobile/MobileSearch';
import { Skeleton } from '@/components/mobile/SkeletonLoader';
import { logger } from '@/lib/logger';

type ResultType = 'incident' | 'service' | 'team' | 'user' | 'policy' | 'postmortem';

type SearchResult = {
    type: ResultType;
    id: string;
    title: string;
    subtitle?: string;
    incidentId?: string;
};

type RecentItem = SearchResult & { timestamp: number };

const RECENTS_KEY = 'mobileQuickSwitcherRecents';
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const typeLabels: Record<ResultType, string> = {
    incident: 'Incident',
    service: 'Service',
    team: 'Team',
    user: 'User',
    policy: 'Policy',
    postmortem: 'Postmortem',
};

const typeTones: Record<ResultType, string> = {
    incident: 'danger',
    service: 'blue',
    team: 'teal',
    user: 'slate',
    policy: 'amber',
    postmortem: 'purple',
};

const typeIcons: Record<ResultType, ReactElement> = {
    incident: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l9 16H3l9-16Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
    ),
    service: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <rect x="4" y="13" width="16" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    ),
    team: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 20c0-3 3-5 6-5s6 2 6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    user: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
    policy: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    postmortem: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),
};

const quickLinks = [
    { href: '/m/incidents', label: 'Incidents' },
    { href: '/m/services', label: 'Services' },
    { href: '/m/teams', label: 'Teams' },
    { href: '/m/schedules', label: 'Schedules' },
];

function mapToMobileHref(result: SearchResult) {
    switch (result.type) {
        case 'incident':
            return `/m/incidents/${result.id}`;
        case 'service':
            return `/m/services/${result.id}`;
        case 'team':
            return `/m/teams/${result.id}`;
        case 'user':
            return `/m/users/${result.id}`;
        case 'policy':
            return `/m/policies/${result.id}`;
        case 'postmortem':
            return `/m/postmortems/${result.id}`;
        default:
            return '/m';
    }
}

function readRecents(): RecentItem[] {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const stored = window.localStorage.getItem(RECENTS_KEY);
        if (!stored) {
            return [];
        }
        const parsed = JSON.parse(stored) as RecentItem[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeRecents(items: RecentItem[]) {
    try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
    } catch {
        // Ignore storage issues silently
    }
}

export default function MobileQuickSwitcher() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recents, setRecents] = useState<RecentItem[]>([]);

    const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;

    useEffect(() => {
        if (!open) {
            return;
        }
        setRecents(readRecents());
    }, [open]);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !hasQuery) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        const handle = window.setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error('Search request failed');
                }
                const data = await response.json();
                setResults((data?.results || []) as SearchResult[]);
            } catch (error: unknown) {
                if ((error as Error).name !== 'AbortError') {
                    logger.error('mobile.quickSwitcher.searchFailed', {
                        component: 'MobileQuickSwitcher',
                        error,
                    });
                }
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(handle);
            controller.abort();
        };
    }, [open, query, hasQuery]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    const recentItems = useMemo(() => recents.slice(0, 5), [recents]);

    const handleSelect = (item: SearchResult) => {
        const updated = [
            { ...item, timestamp: Date.now() },
            ...recents.filter((recent) => !(recent.type === item.type && recent.id === item.id)),
        ].slice(0, 6);
        setRecents(updated);
        writeRecents(updated);
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                className="mobile-qs-trigger"
                aria-label="Open quick switcher"
                onClick={() => setOpen(true)}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21l-4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="mobile-qs-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
                    <div className="mobile-qs-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="mobile-qs-header">
                            <MobileSearch
                                placeholder="Search incidents, services, teams..."
                                value={query}
                                onChange={setQuery}
                                autoFocus
                                rightAction={(
                                    <button
                                        type="button"
                                        className="mobile-qs-cancel"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                )}
                            />
                            <div className="mobile-qs-hint">
                                {hasQuery ? 'Search results' : 'Start typing to search'}
                            </div>
                        </div>

                        <div className="mobile-qs-body">
                            {!hasQuery ? (
                                <>
                                    <div className="mobile-qs-section">
                                        <div className="mobile-qs-section-title">Recent</div>
                                        {recentItems.length === 0 ? (
                                            <div className="mobile-qs-empty">No recent items yet.</div>
                                        ) : (
                                            <div className="mobile-qs-list">
                                                {recentItems.map((item) => (
                                                    <Link
                                                        key={`${item.type}-${item.id}`}
                                                        href={mapToMobileHref(item)}
                                                        className="mobile-qs-item"
                                                        onClick={() => handleSelect(item)}
                                                    >
                                                        <span className={`mobile-qs-icon tone-${typeTones[item.type]}`}>
                                                            {typeIcons[item.type]}
                                                        </span>
                                                        <span className="mobile-qs-info">
                                                            <span className="mobile-qs-title">{item.title}</span>
                                                            {item.subtitle && (
                                                                <span className="mobile-qs-subtitle">{item.subtitle}</span>
                                                            )}
                                                        </span>
                                                        <span className="mobile-qs-type">{typeLabels[item.type]}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mobile-qs-section">
                                        <div className="mobile-qs-section-title">Explore</div>
                                        <div className="mobile-qs-grid">
                                            {quickLinks.map((link) => (
                                                <Link key={link.href} href={link.href} className="mobile-qs-tile">
                                                    {link.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {isLoading && (
                                        <div className="mobile-qs-list mobile-qs-skeleton">
                                            {Array.from({ length: 3 }).map((_, index) => (
                                                <div key={`qs-skeleton-${index}`} className="mobile-qs-item">
                                                    <span className="mobile-qs-icon tone-slate">
                                                        <Skeleton width="20px" height="20px" borderRadius="6px" />
                                                    </span>
                                                    <span className="mobile-qs-info">
                                                        <Skeleton width="70%" height="12px" borderRadius="4px" />
                                                        <Skeleton width="45%" height="10px" borderRadius="4px" />
                                                    </span>
                                                    <Skeleton width="40px" height="10px" borderRadius="4px" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!isLoading && results.length === 0 && (
                                        <div className="mobile-qs-empty">
                                            No matches found. Try a different keyword.
                                        </div>
                                    )}

                                    {!isLoading && results.length > 0 && (
                                        <div className="mobile-qs-list">
                                            {results.map((item) => (
                                                <Link
                                                    key={`${item.type}-${item.id}`}
                                                    href={mapToMobileHref(item)}
                                                    className="mobile-qs-item"
                                                    onClick={() => handleSelect(item)}
                                                >
                                                    <span className={`mobile-qs-icon tone-${typeTones[item.type]}`}>
                                                        {typeIcons[item.type]}
                                                    </span>
                                                    <span className="mobile-qs-info">
                                                        <span className="mobile-qs-title">{item.title}</span>
                                                        {item.subtitle && (
                                                            <span className="mobile-qs-subtitle">{item.subtitle}</span>
                                                        )}
                                                    </span>
                                                    <span className="mobile-qs-type">{typeLabels[item.type]}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
