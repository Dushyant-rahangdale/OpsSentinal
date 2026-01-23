'use client';

import { logger } from '@/lib/logger';
import CustomFieldInput from './CustomFieldInput';
import { Badge } from '@/components/ui/shadcn/badge';
import { Settings, AlertCircle } from 'lucide-react';

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
    options?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    options?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>;
  canManage: boolean;
};

function formatFieldValue(value: string | null, type: string): string {
  if (!value) return '';
  if (type === 'BOOLEAN') return value === 'true' ? 'Yes' : 'No';
  if (type === 'DATE') {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  return value;
}

export default function IncidentCustomFields({
  incidentId,
  customFieldValues,
  allCustomFields,
  canManage,
}: IncidentCustomFieldsProps) {
  // Create a map of existing values
  const valueMap = new Map(customFieldValues.map(v => [v.customField.id, v]));

  // Get all fields (including those without values)
  const fieldsWithValues = allCustomFields.map(field => ({
    field,
    value: valueMap.get(field.id)?.value || null,
    valueId: valueMap.get(field.id)?.id || null,
  }));

  // Empty state when no custom fields exist
  if (allCustomFields.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-slate-100 flex items-center justify-center">
          <Settings className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">No Custom Fields</p>
        <p className="text-xs text-slate-500">
          Custom fields can be configured in Settings → Custom Fields
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fieldsWithValues.map(({ field, value }) => (
        <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          {canManage ? (
            <CustomFieldInput
              field={field}
              value={value || ''}
              onChange={async newValue => {
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
                  if (error instanceof Error) {
                    logger.error('Failed to update custom field', { error: error.message });
                  } else {
                    logger.error('Failed to update custom field', { error: String(error) });
                  }
                  console.log('Failed to update custom field');
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{field.name}</span>
                {field.required && (
                  <Badge
                    variant="warning"
                    size="xs"
                  >
                    Required
                  </Badge>
                )}
              </div>
              <div className="text-sm">
                {value ? (
                  <span className="text-slate-900 font-medium">
                    {formatFieldValue(value, field.type)}
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-xs">Not set</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
