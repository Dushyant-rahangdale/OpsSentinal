'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { type FilterCriteria, criteriaToSearchParams } from '@/lib/search-presets';

type SearchPreset = {
    id: string;
    name: string;
    description: string | null;
    filterCriteria: FilterCriteria;
    icon: string | null;
    color: string | null;
    usageCount: number;
    createdBy: {
        name: string;
    };
};

type PresetSelectorProps = {
    presets: SearchPreset[];
    currentCriteria?: FilterCriteria;
    onPresetSelect?: (preset: SearchPreset) => void;
};

export default function PresetSelector({
    presets,
    currentCriteria,
    onPresetSelect,
}: PresetSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Check if current filters match a preset
    useEffect(() => {
        if (currentCriteria && presets.length > 0) {
            const matchingPreset = presets.find(preset => {
                const presetCriteria = preset.filterCriteria;
                return (
                    presetCriteria.filter === currentCriteria.filter &&
                    presetCriteria.priority === currentCriteria.priority &&
                    presetCriteria.urgency === currentCriteria.urgency &&
                    presetCriteria.sort === currentCriteria.sort &&
                    presetCriteria.search === currentCriteria.search
                );
            });
            setSelectedPresetId(matchingPreset?.id || null);
        }
    }, [currentCriteria, presets]);

    const handlePresetSelect = async (preset: SearchPreset) => {
        setSelectedPresetId(preset.id);
        setIsOpen(false);

        // Track usage
        try {
            await fetch(`/api/search-presets/${preset.id}/use`, {
                method: 'POST',
            });
        } catch (error) {
            console.error('Failed to track preset usage:', error);
        }

        // Apply preset filters
        if (onPresetSelect) {
            onPresetSelect(preset);
        } else {
            const params = criteriaToSearchParams(preset.filterCriteria);
            const newParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value) newParams.set(key, value);
            });
            router.push(`/incidents?${newParams.toString()}`);
        }
    };

    const handleClearPreset = () => {
        setSelectedPresetId(null);
        setIsOpen(false);
        router.push('/incidents');
    };

    const selectedPreset = presets.find(p => p.id === selectedPresetId);
    const myPresets = presets.filter(p => !p.filterCriteria.filter || p.filterCriteria.filter !== 'default');
    const hasPresets = myPresets.length > 0;

    if (!hasPresets) {
        return null;
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <Button
                variant={selectedPreset ? "primary" : "secondary"}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                }}
            >
                {selectedPreset ? (
                    <>
                        {selectedPreset.icon && <span>{selectedPreset.icon}</span>}
                        <span>{selectedPreset.name}</span>
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M7 12h10M11 18h2" />
                        </svg>
                        <span>Saved Searches</span>
                    </>
                )}
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </Button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 'var(--spacing-1)',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '280px',
                        maxWidth: '400px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 1000,
                    }}
                >
                    {selectedPreset && (
                        <>
                            <div
                                style={{
                                    padding: 'var(--spacing-3)',
                                    borderBottom: '1px solid var(--border)',
                                    background: 'var(--color-neutral-50)',
                                }}
                            >
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-1)' }}>
                                    Current: {selectedPreset.name}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearPreset}
                                    style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.5rem' }}
                                >
                                    Clear preset
                                </Button>
                            </div>
                        </>
                    )}

                    <div style={{ padding: 'var(--spacing-2)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-muted)', padding: 'var(--spacing-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            My Presets
                        </div>
                        {myPresets.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetSelect(preset)}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-3)',
                                    textAlign: 'left',
                                    background: selectedPresetId === preset.id ? 'var(--primary-light)' : 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                    color: selectedPresetId === preset.id ? 'var(--primary-dark)' : 'var(--text-primary)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedPresetId !== preset.id) {
                                        e.currentTarget.style.background = 'var(--color-neutral-50)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedPresetId !== preset.id) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                {preset.icon && (
                                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                                        {preset.icon}
                                    </span>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: selectedPresetId === preset.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                                            color: preset.color || 'inherit',
                                            marginBottom: '0.125rem',
                                        }}
                                    >
                                        {preset.name}
                                    </div>
                                    {preset.description && (
                                        <div
                                            style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-muted)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {preset.description}
                                        </div>
                                    )}
                                    {preset.usageCount > 0 && (
                                        <div
                                            style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-muted)',
                                                marginTop: '0.125rem',
                                            }}
                                        >
                                            Used {preset.usageCount} time{preset.usageCount !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                                {selectedPresetId === preset.id && (
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>

                    <div
                        style={{
                            padding: 'var(--spacing-2)',
                            borderTop: '1px solid var(--border)',
                            background: 'var(--color-neutral-50)',
                        }}
                    >
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/settings/search-presets');
                            }}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-2)',
                                textAlign: 'center',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--primary)',
                                fontWeight: 'var(--font-weight-medium)',
                            }}
                        >
                            Manage Presets →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

