'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useModalState } from '@/hooks/useModalState';

type SearchResult = {
    type: 'incident' | 'service' | 'team' | 'user' | 'policy';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    priority?: number;
};

type SearchSection = {
    type: SearchResult['type'] | 'recent' | 'suggestions';
    title: string;
    results: SearchResult[];
};

const RECENT_SEARCHES_KEY = 'opsguard-recent-searches';
const MAX_RECENT_SEARCHES = 5;

// Quick action suggestions
const QUICK_ACTIONS = [
    { label: 'View all incidents', query: 'incident', icon: '⚡' },
    { label: 'View all services', query: 'service', icon: '🔧' },
    { label: 'View all teams', query: 'team', icon: '👥' },
];

export default function SidebarSearch() {
    const [isOpen, setIsOpen] = useModalState('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedSection, setSelectedSection] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const router = useRouter();

    // Load recent searches on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                setRecentSearches(JSON.parse(stored));
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    }, []);

    // Handle global keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isOpen) {
                // Only trigger if not typing in an input/textarea
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setIsOpen]);

    // Group results by type for better organization
    const groupedResults = useMemo(() => {
        const groups: SearchSection[] = [];
        
        if (query.length === 0) {
            // Show suggestions when empty
            if (recentSearches.length > 0) {
                groups.push({
                    type: 'recent',
                    title: 'Recent Searches',
                    results: []
                });
            }
            groups.push({
                type: 'suggestions',
                title: 'Quick Actions',
                results: []
            });
            return groups;
        }

        // Group search results by type
        const typeMap = new Map<SearchResult['type'], SearchResult[]>();
        results.forEach(result => {
            if (!typeMap.has(result.type)) {
                typeMap.set(result.type, []);
            }
            typeMap.get(result.type)!.push(result);
        });

        // Add grouped results
        const typeOrder: SearchResult['type'][] = ['incident', 'service', 'team', 'user', 'policy'];
        typeOrder.forEach(type => {
            const typeResults = typeMap.get(type);
            if (typeResults && typeResults.length > 0) {
                groups.push({
                    type,
                    title: type === 'incident' ? 'Incidents' : 
                           type === 'service' ? 'Services' :
                           type === 'team' ? 'Teams' :
                           type === 'user' ? 'Users' : 'Policies',
                    results: typeResults
                });
            }
        });

        return groups;
    }, [query, results, recentSearches]);

    // Calculate total items for navigation
    const totalItems = useMemo(() => {
        if (query.length === 0) {
            return recentSearches.length + QUICK_ACTIONS.length;
        }
        return groupedResults.reduce((sum, group) => sum + group.results.length, 0);
    }, [query, groupedResults, recentSearches.length]);

    // Save recent search
    const saveRecentSearch = useCallback((searchQuery: string) => {
        if (searchQuery.length < 2) return;
        
        try {
            const updated = [
                searchQuery,
                ...recentSearches.filter(s => s.toLowerCase() !== searchQuery.toLowerCase())
            ].slice(0, MAX_RECENT_SEARCHES);
            
            setRecentSearches(updated);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (e) {
            // Ignore localStorage errors
        }
    }, [recentSearches]);

    // Handle result navigation
    const navigateResult = useCallback((href: string, title?: string) => {
        if (title && query.length >= 2) {
            saveRecentSearch(query);
        }
        router.push(href);
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        setSelectedSection(0);
    }, [query, saveRecentSearch, router, setIsOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setSelectedIndex(0);
                setSelectedSection(0);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (query.length === 0) {
                    // Handle empty state selection
                    if (selectedIndex < recentSearches.length) {
                        const recentQuery = recentSearches[selectedIndex];
                        setQuery(recentQuery);
                        inputRef.current?.focus();
                    } else {
                        const actionIndex = selectedIndex - recentSearches.length;
                        if (actionIndex < QUICK_ACTIONS.length) {
                            const action = QUICK_ACTIONS[actionIndex];
                            setQuery(action.query);
                            inputRef.current?.focus();
                        }
                    }
                } else {
                    // Navigate to selected result
                    let currentIndex = 0;
                    for (const group of groupedResults) {
                        if (selectedIndex < currentIndex + group.results.length) {
                            const result = group.results[selectedIndex - currentIndex];
                            navigateResult(result.href, result.title);
                            return;
                        }
                        currentIndex += group.results.length;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, query, selectedIndex, totalItems, groupedResults, recentSearches, navigateResult]);

    // Handle click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setSelectedIndex(0);
                setSelectedSection(0);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Search API call with debouncing
    useEffect(() => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (query.length < 2) {
            setResults([]);
            setSelectedIndex(0);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        setSelectedIndex(0);

        const timeoutId = setTimeout(async () => {
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            try {
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}`,
                    { signal: abortController.signal }
                );

                if (abortController.signal.aborted) {
                    return;
                }

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();
                setResults(data.results || []);
                saveRecentSearch(query);
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    return;
                }
                console.error('Search error:', err);
                setError('Failed to search. Please try again.');
                setResults([]);
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }, 200);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [query, saveRecentSearch]);

    const handleClearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    // Determine if dropdown should be visible
    const hasDropdownContent = query.length >= 2 
        ? (results.length > 0 || isLoading || error)
        : query.length === 0
            ? true
            : false;

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="topbar-search-trigger"
                aria-label="Search"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <span className="topbar-search-placeholder">Search incidents, services, teams...</span>
                <kbd className="topbar-search-shortcut">
                    <span className="topbar-search-shortcut-key">⌘</span>
                    <span className="topbar-search-shortcut-key">K</span>
                </kbd>
            </button>
        );
    }

    return (
        <>
            {/* Overlay */}
            {hasDropdownContent && (
                <div
                    className="topbar-search-overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}
            <div ref={containerRef} className="topbar-search-container">
                <div className="topbar-search-input-wrapper">
                    <svg className="topbar-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search incidents, services, teams..."
                        className="topbar-search-input"
                        autoFocus
                    />
                    {isLoading && (
                        <div className="topbar-search-loading">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                            </svg>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                            setResults([]);
                            setSelectedIndex(0);
                        }}
                        className="topbar-search-close"
                        aria-label="Close search"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {hasDropdownContent && (
                    <div className="topbar-search-results">
                        {error && (
                            <div className="topbar-search-error">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {query.length === 0 && (
                            <>
                                {recentSearches.length > 0 && (
                                    <div className="topbar-search-section">
                                        <div className="topbar-search-results-header">
                                            <span>Recent Searches</span>
                                            <button
                                                type="button"
                                                onClick={handleClearRecent}
                                                className="topbar-search-clear-recent"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        {recentSearches.map((recentQuery, index) => (
                                            <button
                                                key={recentQuery}
                                                type="button"
                                                onClick={() => {
                                                    setQuery(recentQuery);
                                                    inputRef.current?.focus();
                                                }}
                                                className={`topbar-search-result ${selectedIndex === index ? 'selected' : ''}`}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
                                                    <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586"/>
                                                </svg>
                                                <div className="topbar-search-result-content">
                                                    <div className="topbar-search-result-title">{recentQuery}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="topbar-search-section">
                                    <div className="topbar-search-results-header">
                                        <span>Quick Actions</span>
                                    </div>
                                    {QUICK_ACTIONS.map((action, index) => {
                                        const itemIndex = recentSearches.length + index;
                                        return (
                                            <button
                                                key={action.query}
                                                type="button"
                                                onClick={() => {
                                                    setQuery(action.query);
                                                    inputRef.current?.focus();
                                                }}
                                                className={`topbar-search-result ${selectedIndex === itemIndex ? 'selected' : ''}`}
                                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                            >
                                                <span style={{ fontSize: '1.2rem', marginRight: '0.75rem' }}>{action.icon}</span>
                                                <div className="topbar-search-result-content">
                                                    <div className="topbar-search-result-title">{action.label}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {query.length >= 2 && !isLoading && !error && (
                            <>
                                {results.length === 0 ? (
                                    <div className="topbar-search-empty">
                                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="m21 21-4.35-4.35" />
                                        </svg>
                                        <p>No results found for &quot;{query}&quot;</p>
                                        <span className="topbar-search-empty-hint">Try a different search term</span>
                                    </div>
                                ) : (
                                    groupedResults.map((group, groupIndex) => {
                                        let itemIndex = 0;
                                        // Calculate starting index for this group
                                        for (let i = 0; i < groupIndex; i++) {
                                            itemIndex += groupedResults[i].results.length;
                                        }

                                        return (
                                            <div key={group.type} className="topbar-search-section">
                                                <div className="topbar-search-results-header">
                                                    <span>{group.title} ({group.results.length})</span>
                                                </div>
                                                {group.results.map((result, resultIndex) => {
                                                    const absoluteIndex = itemIndex + resultIndex;
                                                    return (
                                                        <button
                                                            key={`${result.type}-${result.id}`}
                                                            type="button"
                                                            onClick={() => navigateResult(result.href, result.title)}
                                                            className={`topbar-search-result ${selectedIndex === absoluteIndex ? 'selected' : ''}`}
                                                            onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                                                        >
                                                            <div className={`topbar-search-result-icon ${result.type}`}>
                                                                {getTypeIcon(result.type)}
                                                            </div>
                                                            <div className="topbar-search-result-content">
                                                                <div className="topbar-search-result-title">{result.title}</div>
                                                                {result.subtitle && (
                                                                    <div className="topbar-search-result-subtitle">{result.subtitle}</div>
                                                                )}
                                                            </div>
                                                            <div className="topbar-search-result-badge">{result.type}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

function getTypeIcon(type: SearchResult['type']): React.ReactNode {
    const icons = {
        incident: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        ),
        service: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        ),
        team: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
            </svg>
        ),
        user: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z" />
            </svg>
        ),
        policy: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
            </svg>
        )
    };
    return icons[type];
}