'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useModalState } from '@/hooks/useModalState';

type SearchResult = {
    type: 'incident' | 'service' | 'team' | 'user' | 'policy' | 'postmortem';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    priority?: number;
    metadata?: Record<string, any>;
};

type SearchSection = {
    type: SearchResult['type'] | 'recent' | 'suggestions';
    title: string;
    results: SearchResult[];
};

type RecentSearch = {
    query: string;
    timestamp: number;
    resultCount?: number;
};

const RECENT_SEARCHES_KEY = 'opsguard-recent-searches-v2';
const MAX_RECENT_SEARCHES = 8;

// Enhanced quick action suggestions with better categorization
const QUICK_ACTIONS = [
    {
        label: 'View all incidents',
        query: 'incident',
        icon: '⚡',
        category: 'Navigation',
        description: 'Browse all incidents'
    },
    {
        label: 'View all services',
        query: 'service',
        icon: '🔧',
        category: 'Navigation',
        description: 'Manage services'
    },
    {
        label: 'View all teams',
        query: 'team',
        icon: '👥',
        category: 'Navigation',
        description: 'Team management'
    },
    {
        label: 'Create new incident',
        query: 'create incident',
        icon: '➕',
        category: 'Quick Create',
        description: 'Start new incident',
        href: '/incidents/create'
    },
];

export default function SidebarSearch() {
    const [isOpen, setIsOpen] = useModalState('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [searchFilters, setSearchFilters] = useState<Set<string>>(new Set());

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const router = useRouter();

    // Load recent searches on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Handle both old format (string[]) and new format (RecentSearch[])
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (typeof parsed[0] === 'string') {
                        // Migrate old format
                        const migrated: RecentSearch[] = parsed.map((q: string, i: number) => ({
                            query: q,
                            timestamp: Date.now() - (parsed.length - i) * 60000
                        }));
                        setRecentSearches(migrated);
                        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(migrated));
                    } else {
                        setRecentSearches(parsed);
                    }
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    }, []);

    // Handle global keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                const target = e.target as HTMLElement;
                if (target instanceof HTMLInputElement ||
                    target instanceof HTMLTextAreaElement ||
                    target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                if (isOpen) {
                    setIsOpen(false);
                    setQuery('');
                    setResults([]);
                } else {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setIsOpen]);

    // Group results by type with better organization
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

        // Apply filters if any
        let filteredResults = results;
        if (searchFilters.size > 0) {
            filteredResults = results.filter(result =>
                searchFilters.has(result.type)
            );
        }

        // Group search results by type with priority ordering
        const typeMap = new Map<SearchResult['type'], SearchResult[]>();
        filteredResults.forEach(result => {
            if (!typeMap.has(result.type)) {
                typeMap.set(result.type, []);
            }
            typeMap.get(result.type)!.push(result);
        });

        // Order: incidents first (most important), then services, teams, etc.
        const typeOrder: SearchResult['type'][] = [
            'incident',
            'service',
            'team',
            'user',
            'policy',
            'postmortem'
        ];

        typeOrder.forEach(type => {
            const typeResults = typeMap.get(type);
            if (typeResults && typeResults.length > 0) {
                groups.push({
                    type,
                    title: getTypeLabel(type),
                    results: typeResults.slice(0, 8) // Limit per group for performance
                });
            }
        });

        return groups;
    }, [query, results, recentSearches, searchFilters]);

    // Calculate total items for navigation
    const totalItems = useMemo(() => {
        if (query.length === 0) {
            return recentSearches.length + QUICK_ACTIONS.length;
        }
        return groupedResults.reduce((sum, group) => sum + group.results.length, 0);
    }, [query, groupedResults, recentSearches.length]);

    // Save recent search with metadata
    const saveRecentSearch = useCallback((searchQuery: string, resultCount?: number) => {
        if (searchQuery.length < 2) return;

        try {
            const newSearch: RecentSearch = {
                query: searchQuery,
                timestamp: Date.now(),
                resultCount
            };

            setRecentSearches(prev => {
                const updated = [
                    newSearch,
                    ...prev.filter(s =>
                        s.query.toLowerCase() !== searchQuery.toLowerCase()
                    )
                ].slice(0, MAX_RECENT_SEARCHES);

                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
                return updated;
            });
        } catch (e) {
            // Ignore localStorage errors
        }
    }, []);

    // Handle result navigation
    const navigateResult = useCallback((href: string, title?: string) => {
        if (title && query.length >= 2) {
            saveRecentSearch(query, results.length);
        }
        router.push(href);
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        setSearchFilters(new Set());
    }, [query, saveRecentSearch, router, setIsOpen, results.length]);

    // Handle keyboard navigation with improved UX
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setSelectedIndex(0);
                setSearchFilters(new Set());
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
                scrollToSelected();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
                scrollToSelected();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleEnterKey();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                // Allow Ctrl+F in search input
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, query, selectedIndex, totalItems, groupedResults, recentSearches, navigateResult, results.length, router, setIsOpen]);

    // Scroll to selected item
    const scrollToSelected = useCallback(() => {
        const selectedElement = containerRef.current?.querySelector(
            '[data-search-result-index="true"]'
        ) as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, []);

    // Handle Enter key press
    const handleEnterKey = useCallback(() => {
        if (query.length === 0) {
            // Handle empty state selection
            if (selectedIndex < recentSearches.length) {
                const recentQuery = recentSearches[selectedIndex].query;
                setQuery(recentQuery);
                inputRef.current?.focus();
            } else {
                const actionIndex = selectedIndex - recentSearches.length;
                if (actionIndex < QUICK_ACTIONS.length) {
                    const action = QUICK_ACTIONS[actionIndex];
                    if (action.href) {
                        router.push(action.href);
                        setIsOpen(false);
                        setQuery('');
                    } else {
                        setQuery(action.query);
                        inputRef.current?.focus();
                    }
                }
            }
        } else {
            // Navigate to selected result
            if (results.length === 0) return;

            let currentIndex = 0;
            for (const group of groupedResults) {
                if (selectedIndex >= currentIndex &&
                    selectedIndex < currentIndex + group.results.length) {
                    const resultIndex = selectedIndex - currentIndex;
                    const result = group.results[resultIndex];
                    if (result) {
                        navigateResult(result.href, result.title);
                        return;
                    }
                }
                currentIndex += group.results.length;
            }
        }
    }, [query, selectedIndex, totalItems, groupedResults, recentSearches, navigateResult, router, setIsOpen, results.length]);

    // Handle click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                const triggerButton = document.querySelector('.search-trigger-btn');
                if (triggerButton && triggerButton.contains(target)) {
                    return;
                }
                setIsOpen(false);
                setQuery('');
                setResults([]);
                setSelectedIndex(0);
                setSearchFilters(new Set());
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    // Search API call with debouncing
    useEffect(() => {
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
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Search failed with status ${response.status}`);
                }

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                setResults(data.results || []);
                saveRecentSearch(query, data.results?.length || 0);
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    return;
                }
                console.error('Search error:', err);
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                setError(getUserFriendlyError(err) || 'Failed to search. Please try again.');
                setResults([]);
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }, 250); // Slightly longer debounce for better UX

        return () => {
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const handleClearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    // Get available filter types from results
    const availableFilters = useMemo(() => {
        const types = new Set<SearchResult['type']>();
        results.forEach(result => types.add(result.type));
        return Array.from(types);
    }, [results]);

    const toggleFilter = (type: SearchResult['type']) => {
        setSearchFilters(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
        setSelectedIndex(0);
    };

    // Determine if dropdown should be visible
    const hasDropdownContent = query.length >= 2
        ? (results.length > 0 || isLoading || error)
        : query.length === 0
            ? (recentSearches.length > 0 || QUICK_ACTIONS.length > 0)
            : false;

    // Format recent search time
    const formatRecentTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return formatDateTime(new Date(timestamp), getBrowserTimeZone(), { format: 'date' });
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="search-trigger-btn"
                aria-label="Search"
            >
                <div className="search-trigger-content">
                    <svg
                        className="search-trigger-icon"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span className="search-trigger-placeholder">
                        Search incidents, services, teams...
                    </span>
                    <div className="search-trigger-shortcut">
                        <kbd className="search-shortcut-key">
                            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                        </kbd>
                        <kbd className="search-shortcut-key">K</kbd>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <>
            {/* Overlay with blur effect */}
            {isOpen && (
                <div
                    className="search-overlay"
                    onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                        setResults([]);
                        setSelectedIndex(0);
                        setSearchFilters(new Set());
                    }}
                />
            )}

            {/* Main Search Container */}
            <div ref={containerRef} className="search-container">
                {/* Search Input Bar */}
                <div className="search-input-bar">
                    <div className="search-input-wrapper">
                        <svg
                            className="search-input-icon"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
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
                            placeholder="Search incidents, services, teams, users..."
                            className="search-input"
                            autoFocus
                            autoComplete="off"
                            spellCheck="false"
                        />
                        {isLoading && (
                            <div className="search-loading-indicator">
                                <div className="search-spinner" />
                            </div>
                        )}
                        {query.length > 0 && !isLoading && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                    setSelectedIndex(0);
                                }}
                                className="search-clear-btn"
                                aria-label="Clear search"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Search Filters */}
                    {query.length >= 2 && availableFilters.length > 0 && (
                        <div className="search-filters">
                            {availableFilters.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleFilter(type)}
                                    className={`search-filter-chip ${searchFilters.has(type) ? 'active' : ''
                                        }`}
                                >
                                    <span className="search-filter-icon">
                                        {getTypeIconSmall(type)}
                                    </span>
                                    <span>{getTypeLabel(type)}</span>
                                    {searchFilters.has(type) && (
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search Results Panel */}
                {hasDropdownContent && (
                    <div className="search-results-panel">
                        {error && (
                            <div className="search-error-state">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <div>
                                    <div className="search-error-title">{error}</div>
                                    <div className="search-error-hint">Please try again</div>
                                </div>
                            </div>
                        )}

                        {/* Empty State (no query) */}
                        {query.length === 0 && !error && (
                            <>
                                {recentSearches.length > 0 && (
                                    <div className="search-section">
                                        <div className="search-section-header">
                                            <span className="search-section-title">Recent Searches</span>
                                            <button
                                                type="button"
                                                onClick={handleClearRecent}
                                                className="search-section-action"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                        <div className="search-section-content">
                                            {recentSearches.map((recent, index) => (
                                                <button
                                                    key={`${recent.query}-${recent.timestamp}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setQuery(recent.query);
                                                        inputRef.current?.focus();
                                                    }}
                                                    className={`search-result-item ${selectedIndex === index ? 'selected' : ''
                                                        }`}
                                                    data-search-result-index={selectedIndex === index}
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                >
                                                    <div className="search-result-icon recent">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                        >
                                                            <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586" />
                                                        </svg>
                                                    </div>
                                                    <div className="search-result-content">
                                                        <div className="search-result-title">
                                                            {recent.query}
                                                        </div>
                                                        <div className="search-result-meta">
                                                            {recent.resultCount !== undefined && (
                                                                <span className="search-result-count">
                                                                    {recent.resultCount} result{recent.resultCount !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            <span className="search-result-time">
                                                                {formatRecentTime(recent.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div className="search-section">
                                    <div className="search-section-header">
                                        <span className="search-section-title">Quick Actions</span>
                                    </div>
                                    <div className="search-section-content">
                                        {QUICK_ACTIONS.map((action, index) => {
                                            const itemIndex = recentSearches.length + index;
                                            return (
                                                <button
                                                    key={action.query}
                                                    type="button"
                                                    onClick={() => {
                                                        if (action.href) {
                                                            router.push(action.href);
                                                            setIsOpen(false);
                                                            setQuery('');
                                                        } else {
                                                            setQuery(action.query);
                                                            inputRef.current?.focus();
                                                        }
                                                    }}
                                                    className={`search-result-item ${selectedIndex === itemIndex ? 'selected' : ''
                                                        }`}
                                                    data-search-result-index={selectedIndex === itemIndex}
                                                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                >
                                                    <div className="search-result-icon action">
                                                        <span className="search-result-icon-emoji">{action.icon}</span>
                                                    </div>
                                                    <div className="search-result-content">
                                                        <div className="search-result-title">
                                                            {action.label}
                                                        </div>
                                                        <div className="search-result-subtitle">
                                                            {action.description}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Search Results */}
                        {query.length >= 2 && !isLoading && !error && (
                            <>
                                {results.length === 0 ? (
                                    <div className="search-empty-state">
                                        <div className="search-empty-icon">
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="48"
                                                height="48"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            >
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="m21 21-4.35-4.35" />
                                            </svg>
                                        </div>
                                        <div className="search-empty-title">
                                            No results found
                                        </div>
                                        <div className="search-empty-hint">
                                            Try searching for &quot;{query}&quot; with different terms
                                        </div>
                                        <div className="search-empty-suggestions">
                                            <span>Try:</span>
                                            <button
                                                type="button"
                                                onClick={() => setQuery('incident')}
                                                className="search-empty-link"
                                            >
                                                incident
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuery('service')}
                                                className="search-empty-link"
                                            >
                                                service
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQuery('team')}
                                                className="search-empty-link"
                                            >
                                                team
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    groupedResults.map((group, groupIndex) => {
                                        let itemIndex = 0;
                                        // Calculate starting index for this group
                                        for (let i = 0; i < groupIndex; i++) {
                                            itemIndex += groupedResults[i].results.length;
                                        }

                                        return (
                                            <div key={group.type} className="search-section">
                                                <div className="search-section-header">
                                                    <span className="search-section-title">
                                                        {group.title}
                                                    </span>
                                                    <span className="search-section-count">
                                                        {group.results.length}
                                                    </span>
                                                </div>
                                                <div className="search-section-content">
                                                    {group.results.map((result, resultIndex) => {
                                                        const absoluteIndex = itemIndex + resultIndex;
                                                        return (
                                                            <button
                                                                key={`${result.type}-${result.id}`}
                                                                type="button"
                                                                onClick={() => navigateResult(result.href, result.title)}
                                                                className={`search-result-item ${selectedIndex === absoluteIndex ? 'selected' : ''
                                                                    }`}
                                                                data-search-result-index={selectedIndex === absoluteIndex}
                                                                onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                                                            >
                                                                <div className={`search-result-icon ${result.type}`}>
                                                                    {getTypeIcon(result.type)}
                                                                </div>
                                                                <div className="search-result-content">
                                                                    <div className="search-result-title">
                                                                        {highlightMatch(result.title, query)}
                                                                    </div>
                                                                    {result.subtitle && (
                                                                        <div className="search-result-subtitle">
                                                                            {result.subtitle}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="search-result-badge">
                                                                    {result.type}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="search-loading-state">
                                <div className="search-spinner-large" />
                                <div className="search-loading-text">Searching...</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

// Helper functions
function getTypeLabel(type: SearchResult['type']): string {
    const labels: Record<SearchResult['type'], string> = {
        incident: 'Incidents',
        service: 'Services',
        team: 'Teams',
        user: 'Users',
        policy: 'Escalation Policies',
        postmortem: 'Postmortems'
    };
    return labels[type] || type;
}

function getTypeIcon(type: SearchResult['type']): React.ReactNode {
    const icons: Record<SearchResult['type'], React.ReactNode> = {
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
        ),
        postmortem: (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    };
    return icons[type] || icons.incident;
}

function getTypeIconSmall(type: SearchResult['type']): React.ReactNode {
    const iconPaths: Record<SearchResult['type'], string> = {
        incident: "M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4",
        service: "M4 6h16v5H4V6Zm0 7h16v5H4v-5Z",
        team: "M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z",
        user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z",
        policy: "M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z",
        postmortem: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    };

    return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d={iconPaths[type] || iconPaths.incident} />
        </svg>
    );
}

// Highlight search matches in text with better styling
function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query || query.length < 2) {
        return text;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
        return text;
    }

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
        <>
            {before}
            <mark className="search-highlight">{match}</mark>
            {after}
        </>
    );
}
