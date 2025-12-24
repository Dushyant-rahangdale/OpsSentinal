'use client';

import { useState } from 'react';
import { Button, FormField } from '@/components/ui';

export type ActionItem = {
    id: string;
    title: string;
    description: string;
    owner?: string;
    dueDate?: string; // ISO string
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
};

interface PostmortemActionItemsProps {
    actionItems: ActionItem[];
    onChange: (items: ActionItem[]) => void;
    users?: Array<{ id: string; name: string; email: string }>;
}

const STATUS_COLORS = {
    OPEN: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    COMPLETED: '#22c55e',
    BLOCKED: '#ef4444',
};

const STATUS_LABELS = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    BLOCKED: 'Blocked',
};

const PRIORITY_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#6b7280',
};

const PRIORITY_LABELS = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
};

export default function PostmortemActionItems({ actionItems, onChange, users = [] }: PostmortemActionItemsProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<ActionItem>>({
        status: 'OPEN',
        priority: 'MEDIUM',
    });

    const addItem = () => {
        if (!newItem.title) return;

        const item: ActionItem = {
            id: `action-${Date.now()}`,
            title: newItem.title,
            description: newItem.description || '',
            owner: newItem.owner,
            dueDate: newItem.dueDate,
            status: newItem.status || 'OPEN',
            priority: newItem.priority || 'MEDIUM',
        };

        onChange([...actionItems, item]);
        setNewItem({
            status: 'OPEN',
            priority: 'MEDIUM',
        });
    };

    const updateItem = (id: string, updates: Partial<ActionItem>) => {
        onChange(actionItems.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const deleteItem = (id: string) => {
        onChange(actionItems.filter(item => item.id !== id));
    };

    const completedCount = actionItems.filter(item => item.status === 'COMPLETED').length;
    const completionRate = actionItems.length > 0 ? (completedCount / actionItems.length) * 100 : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ 
                padding: 'var(--spacing-4)', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>
                        Action Items
                    </h3>
                    {actionItems.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                {completedCount}/{actionItems.length} completed
                            </span>
                            <div style={{
                                width: '100px',
                                height: '8px',
                                background: '#e2e8f0',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${completionRate}%`,
                                    height: '100%',
                                    background: completionRate === 100 ? '#22c55e' : '#3b82f6',
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--spacing-2)' }}>
                        <FormField
                            type="input"
                            inputType="text"
                            label="Title"
                            value={newItem.title || ''}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            placeholder="e.g., Add monitoring for service X"
                        />
                        <FormField
                            label="Priority"
                            type="select"
                            value={newItem.priority || 'MEDIUM'}
                            onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                        />
                        <FormField
                            label="Status"
                            type="select"
                            value={newItem.status || 'OPEN'}
                            onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                        />
                    </div>
                    <FormField
                        label="Description"
                        type="textarea"
                        rows={2}
                        value={newItem.description || ''}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Detailed description of the action item..."
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
                        {users.length > 0 && (
                            <FormField
                                label="Owner"
                                type="select"
                                value={newItem.owner || ''}
                                onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })}
                                options={[
                                    { value: '', label: 'Unassigned' },
                                    ...users.map(user => ({ value: user.id, label: user.name })),
                                ]}
                            />
                        )}
                        <FormField
                            type="input"
                            inputType="date"
                            label="Due Date"
                            value={newItem.dueDate || ''}
                            onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={addItem}
                        disabled={!newItem.title}
                    >
                        Add Action Item
                    </Button>
                </div>
            </div>

            {actionItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    {actionItems.map((item) => {
                        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED';
                        const owner = users.find(u => u.id === item.owner);

                        return (
                            <div
                                key={item.id}
                                style={{
                                    padding: 'var(--spacing-4)',
                                    background: 'white',
                                    border: `2px solid ${STATUS_COLORS[item.status]}40`,
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: `4px solid ${STATUS_COLORS[item.status]}`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-2)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>
                                            <span
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: '600',
                                                    background: `${STATUS_COLORS[item.status]}20`,
                                                    color: STATUS_COLORS[item.status],
                                                }}
                                            >
                                                {STATUS_LABELS[item.status]}
                                            </span>
                                            <span
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: '600',
                                                    background: `${PRIORITY_COLORS[item.priority]}20`,
                                                    color: PRIORITY_COLORS[item.priority],
                                                }}
                                            >
                                                {PRIORITY_LABELS[item.priority]} Priority
                                            </span>
                                            {isOverdue && (
                                                <span
                                                    style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--font-size-xs)',
                                                        fontWeight: '600',
                                                        background: '#ef444420',
                                                        color: '#ef4444',
                                                    }}
                                                >
                                                    Overdue
                                                </span>
                                            )}
                                        </div>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', marginBottom: 'var(--spacing-1)' }}>
                                            {item.title}
                                        </h4>
                                        {item.description && (
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-1)' }}>
                                                {item.description}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', gap: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            {owner && (
                                                <span>👤 {owner.name}</span>
                                            )}
                                            {item.dueDate && (
                                                <span>📅 Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                                        >
                                            {editingId === item.id ? 'Cancel' : 'Edit'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => deleteItem(item.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                {editingId === item.id && (
                                    <div style={{ 
                                        marginTop: 'var(--spacing-3)', 
                                        padding: 'var(--spacing-3)', 
                                        background: 'var(--color-neutral-50)',
                                        borderRadius: 'var(--radius-sm)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--spacing-2)',
                                    }}>
                                        <FormField
                                            type="input"
                                            inputType="text"
                                            label="Title"
                                            value={item.title}
                                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                        />
                                        <FormField
                                            label="Description"
                                            type="textarea"
                                            rows={2}
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-2)' }}>
                                            <FormField
                                                label="Status"
                                                type="select"
                                                value={item.status}
                                                onChange={(e) => updateItem(item.id, { status: e.target.value as any })}
                                                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                                            />
                                            <FormField
                                                label="Priority"
                                                type="select"
                                                value={item.priority}
                                                onChange={(e) => updateItem(item.id, { priority: e.target.value as any })}
                                                options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                                            />
                                        </div>
                                        {users.length > 0 && (
                                            <FormField
                                                label="Owner"
                                                type="select"
                                                value={item.owner || ''}
                                                onChange={(e) => updateItem(item.id, { owner: e.target.value })}
                                                options={[
                                                    { value: '', label: 'Unassigned' },
                                                    ...users.map(user => ({ value: user.id, label: user.name })),
                                                ]}
                                            />
                                        )}
                                            <FormField
                                                type="input"
                                                inputType="date"
                                                label="Due Date"
                                                value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
                                            />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
