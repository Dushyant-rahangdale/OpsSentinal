'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, FormField } from '@/components/ui';
import { type FilterCriteria } from '@/lib/search-presets';

type CreatePresetFromCurrentProps = {
    currentCriteria: FilterCriteria;
    onPresetCreated?: () => void;
};

export default function CreatePresetFromCurrent({
    currentCriteria,
    onPresetCreated,
}: CreatePresetFromCurrentProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Preset name is required');
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch('/api/search-presets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim() || null,
                        filterCriteria: currentCriteria,
                        isShared: false,
                        isPublic: false,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save preset');
                }

                setIsOpen(false);
                setName('');
                setDescription('');
                router.refresh();
                if (onPresetCreated) {
                    onPresetCreated();
                }
            } catch (err: any) {
                setError(err.message || 'Failed to save preset');
            }
        });
    };

    const criteriaText = [
        currentCriteria.filter && currentCriteria.filter !== 'all_open' && `Filter: ${currentCriteria.filter}`,
        currentCriteria.priority && currentCriteria.priority !== 'all' && `Priority: ${currentCriteria.priority}`,
        currentCriteria.urgency && currentCriteria.urgency !== 'all' && `Urgency: ${currentCriteria.urgency}`,
        currentCriteria.sort && currentCriteria.sort !== 'newest' && `Sort: ${currentCriteria.sort}`,
        currentCriteria.search && `Search: "${currentCriteria.search}"`,
    ].filter(Boolean).join(' • ') || 'Default filters';

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
                title="Save current filters as preset"
            >
                💾 Save Search
            </Button>

            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={() => {
                        setIsOpen(false);
                        setError(null);
                        setName('');
                        setDescription('');
                    }}
                    title="Save Search Preset"
                    size="md"
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        <FormField
                            type="input"
                            label="Preset Name *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g., My Open Incidents"
                        />

                        <FormField
                            type="textarea"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={2}
                        />

                        <div style={{ padding: 'var(--spacing-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                            <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-2)', color: 'var(--text-primary)' }}>
                                Current filters:
                            </div>
                            <div>{criteriaText}</div>
                        </div>

                        {error && (
                            <div style={{
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-error-light)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-error-dark)',
                                fontSize: 'var(--font-size-sm)',
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setIsOpen(false);
                                    setError(null);
                                    setName('');
                                    setDescription('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isPending}
                            >
                                Save Preset
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}

