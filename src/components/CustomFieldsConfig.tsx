'use client';

import { useState, useTransition } from 'react';
import { Card, Button, FormField, Select, Switch } from '@/components/ui';
import { useRouter } from 'next/navigation';

type CustomField = {
    id: string;
    name: string;
    key: string;
    type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL';
    required: boolean;
    defaultValue?: string | null;
    options?: any;
    order: number;
    showInList: boolean;
    _count: {
        values: number;
    };
};

type CustomFieldsConfigProps = {
    customFields: CustomField[];
};

export default function CustomFieldsConfig({ customFields: initialFields }: CustomFieldsConfigProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [customFields, setCustomFields] = useState(initialFields);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        key: '',
        type: 'TEXT' as CustomField['type'],
        required: false,
        defaultValue: '',
        options: '',
        showInList: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate key format (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(formData.key)) {
            setError('Key must contain only letters, numbers, and underscores');
            return;
        }

        startTransition(async () => {
            try {
                const options = formData.type === 'SELECT' && formData.options
                    ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
                    : null;

                const response = await fetch('/api/settings/custom-fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        options,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save custom field');
                }

                router.refresh();
                setShowAddForm(false);
                setFormData({
                    name: '',
                    key: '',
                    type: 'TEXT',
                    required: false,
                    defaultValue: '',
                    options: '',
                    showInList: false,
                });
            } catch (err: any) {
                setError(err.message || 'Failed to save custom field');
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this custom field? This will remove all values for this field.')) {
            return;
        }

        startTransition(async () => {
            try {
                const response = await fetch(`/api/settings/custom-fields/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete custom field');
                }

                router.refresh();
            } catch (err: any) {
                setError(err.message || 'Failed to delete custom field');
            }
        });
    };

    const fieldTypeOptions = [
        { value: 'TEXT', label: 'Text' },
        { value: 'NUMBER', label: 'Number' },
        { value: 'DATE', label: 'Date' },
        { value: 'SELECT', label: 'Select (Dropdown)' },
        { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
        { value: 'URL', label: 'URL' },
        { value: 'EMAIL', label: 'Email' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            {/* Add New Field */}
            <Card>
                <div style={{ padding: 'var(--spacing-5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                            Add Custom Field
                        </h2>
                        <Button
                            variant="primary"
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            {showAddForm ? 'Cancel' : '+ Add Field'}
                        </Button>
                    </div>

                    {showAddForm && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                                <FormField
                                    label="Field Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g., Customer ID"
                                />
                                <FormField
                                    label="Field Key"
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    required
                                    placeholder="e.g., customer_id"
                                    helperText="Unique identifier (letters, numbers, underscores only)"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                                        Field Type
                                    </label>
                                    <Select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomField['type'] })}
                                        options={fieldTypeOptions}
                                    />
                                </div>
                                <FormField
                                    label="Default Value (Optional)"
                                    value={formData.defaultValue}
                                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                                    placeholder="Default value for new incidents"
                                />
                            </div>

                            {formData.type === 'SELECT' && (
                                <FormField
                                    label="Options (comma-separated)"
                                    value={formData.options}
                                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                    required={formData.type === 'SELECT'}
                                    placeholder="Option 1, Option 2, Option 3"
                                    helperText="Enter options separated by commas"
                                />
                            )}

                            <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                                <Switch
                                    checked={formData.required}
                                    onChange={(checked) => setFormData({ ...formData, required: checked })}
                                    label="Required Field"
                                />
                                <Switch
                                    checked={formData.showInList}
                                    onChange={(checked) => setFormData({ ...formData, showInList: checked })}
                                    label="Show in Incident List"
                                />
                            </div>

                            {error && (
                                <div style={{ padding: 'var(--spacing-3)', background: 'var(--color-error-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-error-dark)' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isPending}
                                >
                                    Create Field
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </Card>

            {/* Existing Fields */}
            <Card>
                <div style={{ padding: 'var(--spacing-5)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                        Custom Fields ({customFields.length})
                    </h2>

                    {customFields.length === 0 ? (
                        <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p>No custom fields defined yet. Add your first custom field above.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                            {customFields.map((field) => (
                                <div
                                    key={field.id}
                                    style={{
                                        padding: 'var(--spacing-4)',
                                        background: 'var(--color-neutral-50)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-neutral-200)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-1)' }}>
                                            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                                                {field.name}
                                            </h3>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                background: 'var(--color-neutral-200)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-muted)',
                                            }}>
                                                {field.key}
                                            </span>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                background: 'var(--primary-light)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--primary-dark)',
                                            }}>
                                                {field.type}
                                            </span>
                                            {field.required && (
                                                <span style={{
                                                    padding: '0.125rem 0.5rem',
                                                    background: 'var(--color-error-light)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-error-dark)',
                                                }}>
                                                    Required
                                                </span>
                                            )}
                                            {field.showInList && (
                                                <span style={{
                                                    padding: '0.125rem 0.5rem',
                                                    background: 'var(--color-success-light)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-success-dark)',
                                                }}>
                                                    In List
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                            Used in {field._count.values} incident{field._count.values !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <Button
                                        variant="error"
                                        size="sm"
                                        onClick={() => handleDelete(field.id)}
                                        disabled={isPending}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}





