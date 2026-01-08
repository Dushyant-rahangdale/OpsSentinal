'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type Template = {
  id: string;
  name: string;
  description?: string | null;
  title: string;
  descriptionText?: string | null;
  defaultUrgency: 'HIGH' | 'LOW';
  defaultPriority?: string | null;
  defaultService?: { id: string; name: string } | null;
};

type TemplateSelectorProps = {
  templates: Template[];
  selectedTemplateId: string | null;
  selectedTemplate: Template | null;
};

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  selectedTemplate,
}: TemplateSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (templateId) {
      // Update URL without page reload
      const params = new URLSearchParams(searchParams.toString());
      params.set('template', templateId);
      router.replace(`/incidents/create?${params.toString()}`, { scroll: false });
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('template');
      router.replace(`/incidents/create?${params.toString()}`, { scroll: false });
    }
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f9fafb',
        border: '1px solid var(--border)',
        borderRadius: '0px',
      }}
    >
      <label
        htmlFor="template-select"
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
        }}
      >
        Use Template (Optional)
      </label>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <select
          id="template-select"
          onChange={handleTemplateChange}
          value={selectedTemplateId || ''}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            background: 'white',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <option value="">No template (create from scratch)</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name} {template.defaultService ? `(${template.defaultService.name})` : ''}
            </option>
          ))}
        </select>
        {templates.length > 0 && (
          <a
            href="/incidents/templates"
            style={{
              padding: '0.75rem 1rem',
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              color: 'var(--primary-color)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Manage Templates ƒ+'
          </a>
        )}
      </div>
      {selectedTemplate && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'white',
            border: '1px solid var(--primary-light)',
            borderRadius: '0px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Template: {selectedTemplate.name}</strong>
          {selectedTemplate.description && (
            <div style={{ marginTop: '0.25rem' }}>{selectedTemplate.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
