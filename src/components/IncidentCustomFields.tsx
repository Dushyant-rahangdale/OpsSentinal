'use client';

import { Card } from '@/components/ui';
import CustomFieldInput from './CustomFieldInput';

type CustomFieldValue = {
    id: string;
    value: string | null;
    customField: {
        id: string;
        name: string;
        key: string;
        type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL';
        required: boolean;
        defaultValue?: string | null;
        options?: any;
    };
};

type IncidentCustomFieldsProps = {
    incidentId: string;
    customFieldValues: CustomFieldValue[];
    allCustomFields: Array<{
        id: string;
        name: string;
        key: string;
        type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL';
        required: boolean;
        defaultValue?: string | null;
        options?: any;
    }>;
    canManage: boolean;
};

export default function IncidentCustomFields({
    incidentId,
    customFieldValues,
    allCustomFields,
    canManage,
}: IncidentCustomFieldsProps) {
    if (allCustomFields.length === 0) {
        return null;
    }

    // Create a map of existing values
    const valueMap = new Map(customFieldValues.map(v => [v.customField.id, v]));

    // Get all fields (including those without values)
    const fieldsWithValues = allCustomFields.map(field => ({
        field,
        value: valueMap.get(field.id)?.value || null,
        valueId: valueMap.get(field.id)?.id || null,
    }));

    return (
        <Card>
            <div style={{ padding: 'var(--spacing-5)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                    Custom Fields
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                    {fieldsWithValues.map(({ field, value, valueId }) => (
                        <div key={field.id}>
                            {canManage ? (
                                <CustomFieldInput
                                    field={field}
                                    value={value || ''}
                                    onChange={async (newValue) => {
                                        try {
                                            const response = await fetch(`/api/incidents/${incidentId}/custom-fields`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    customFieldId: field.id,
                                                    value: newValue,
                                                }),
                                            });
                                            if (!response.ok) {
                                                throw new Error('Failed to update custom field');
                                            }
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('Failed to update custom field:', error);
                                            alert('Failed to update custom field');
                                        }
                                    }}
                                />
                            ) : (
                                <div>
                                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-muted)' }}>
                                        {field.name}
                                    </label>
                                    <div style={{
                                        padding: 'var(--spacing-3)',
                                        background: 'var(--color-neutral-50)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-neutral-200)',
                                        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: 'var(--font-size-base)',
                                    }}>
                                        {value || <span style={{ fontStyle: 'italic' }}>Not set</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}





