'use client';

import { useActionState } from 'react';
import Link from 'next/link';

type Service = {
  id: string;
  name: string;
};

type TemplateCreateFormProps = {
  services: Service[];
  action: (prevState: null, formData: FormData) => Promise<null>;
};

export default function TemplateCreateForm({ services, action }: TemplateCreateFormProps) {
  const [_state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Template Name */}
      <div>
        <label
          htmlFor="name"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Template Name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="e.g., Database Outage, API Downtime, Service Degradation"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.9rem',
            background: 'white',
          }}
        />
      </div>

      {/* Template Description */}
      <div>
        <label
          htmlFor="description"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Template Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Brief description of when to use this template..."
          rows={2}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.9rem',
            background: 'white',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Default Title */}
      <div>
        <label
          htmlFor="title"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Default Incident Title <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          placeholder="e.g., Database Connection Failure"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.9rem',
            background: 'white',
          }}
        />
      </div>

      {/* Default Description */}
      <div>
        <label
          htmlFor="descriptionText"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Default Incident Description (Optional)
        </label>
        <textarea
          id="descriptionText"
          name="descriptionText"
          placeholder="Default description that will be pre-filled when using this template..."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.9rem',
            background: 'white',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Default Urgency */}
        <div>
          <label
            htmlFor="defaultUrgency"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            Default Urgency
          </label>
          <select
            id="defaultUrgency"
            name="defaultUrgency"
            defaultValue="HIGH"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              fontSize: '0.9rem',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Default Priority */}
        <div>
          <label
            htmlFor="defaultPriority"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            Default Priority (Optional)
          </label>
          <select
            id="defaultPriority"
            name="defaultPriority"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0px',
              fontSize: '0.9rem',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">None</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
            <option value="P5">P5 - Informational</option>
          </select>
        </div>
      </div>

      {/* Default Service */}
      <div>
        <label
          htmlFor="defaultServiceId"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Default Service (Optional)
        </label>
        <select
          id="defaultServiceId"
          name="defaultServiceId"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            fontSize: '0.9rem',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="">None - User selects service</option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {/* Public Template */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input
          type="checkbox"
          id="isPublic"
          name="isPublic"
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="isPublic" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
          Make this template public (visible to all users)
        </label>
      </div>

      {/* Submit Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Link
          href="/incidents/templates"
          className="glass-button"
          style={{
            textDecoration: 'none',
            borderRadius: '0px',
            padding: '0.75rem 1.5rem',
            border: '1px solid var(--border)',
            background: 'white',
          }}
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="glass-button primary"
          disabled={isPending}
          style={{
            borderRadius: '0px',
            padding: '0.75rem 1.5rem',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isPending ? 'Creating...' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}
