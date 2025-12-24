'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../ToastProvider';
import { addTagToIncident, removeTagFromIncident, getAllTags } from '@/app/(app)/incidents/tag-actions';

type IncidentTagsProps = {
    incidentId: string;
    tags: Array<{ id: string; name: string; color?: string | null }>;
    canManage: boolean;
};

export default function IncidentTags({ incidentId, tags, canManage }: IncidentTagsProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);
    const [isPending, startTransition] = useTransition();

    const handleAddTag = async () => {
        if (!newTagName.trim()) return;

        startTransition(async () => {
            try {
                await addTagToIncident(incidentId, newTagName.trim());
                showToast('Tag added successfully', 'success');
                setNewTagName('');
                setIsAdding(false);
                router.refresh();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to add tag', 'error');
            }
        });
    };

    const handleRemoveTag = async (tagId: string) => {
        startTransition(async () => {
            try {
                await removeTagFromIncident(incidentId, tagId);
                showToast('Tag removed successfully', 'success');
                router.refresh();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to remove tag', 'error');
            }
        });
    };

    const loadAvailableTags = async () => {
        try {
            const allTags = await getAllTags();
            setAvailableTags(allTags);
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    const getTagColor = (tagName: string) => {
        // Simple hash-based color generation
        const colors = [
            { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
            { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
            { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
            { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
            { bg: '#fce7f3', color: '#9f1239', border: '#fbcfe8' },
            { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
        ];
        const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tags
                </h4>
                {canManage && !isAdding && (
                    <button
                        type="button"
                        onClick={() => {
                            setIsAdding(true);
                            loadAvailableTags();
                        }}
                        style={{
                            padding: '0.25rem 0.5rem',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            color: 'var(--primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        + Add Tag
                    </button>
                )}
            </div>

            {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {tags.map((tag) => {
                        const tagColors = getTagColor(tag.name);
                        return (
                            <span
                                key={tag.id}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.25rem 0.625rem',
                                    background: tagColors.bg,
                                    color: tagColors.color,
                                    border: `1px solid ${tagColors.border}`,
                                    borderRadius: '0px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}
                            >
                                #{tag.name}
                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag.id)}
                                        disabled={isPending}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: tagColors.color,
                                            cursor: isPending ? 'not-allowed' : 'pointer',
                                            padding: 0,
                                            margin: 0,
                                            fontSize: '0.9rem',
                                            lineHeight: 1,
                                            opacity: isPending ? 0.5 : 1
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}

            {isAdding && canManage && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                            } else if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewTagName('');
                            }
                        }}
                        placeholder="Tag name..."
                        autoFocus
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.85rem'
                        }}
                        list="available-tags"
                    />
                    <datalist id="available-tags">
                        {availableTags.map((tag) => (
                            <option key={tag.id} value={tag.name} />
                        ))}
                    </datalist>
                    <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={isPending || !newTagName.trim()}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: isPending || !newTagName.trim() ? 'not-allowed' : 'pointer',
                            opacity: isPending || !newTagName.trim() ? 0.6 : 1
                        }}
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsAdding(false);
                            setNewTagName('');
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {tags.length === 0 && !isAdding && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No tags assigned
                </p>
            )}
        </div>
    );
}









