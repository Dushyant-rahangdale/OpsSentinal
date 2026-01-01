'use client';

type IncidentResolutionProps = {
  incidentId: string;
  canManage: boolean;
  onResolve: (formData: FormData) => void;
};

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="glass-button primary"
      style={{
        width: '100%',
        borderRadius: '0px',
        padding: '0.875rem 1.5rem',
        fontWeight: 600,
        fontSize: '0.9rem',
        opacity: pending ? 0.7 : 1,
        cursor: pending ? 'not-allowed' : 'pointer',
      }}
    >
      {pending ? 'Resolving...' : 'Resolve with Note'}
    </button>
  );
}

export default function IncidentResolution({
  incidentId: _incidentId,
  canManage,
  onResolve,
}: IncidentResolutionProps) {
  if (!canManage) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '0px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
          opacity: 0.7,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h4 style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Resolution</h4>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            Required
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          ⚠️ You don&apos;t have access to resolve incidents. Responder role or above required.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem', opacity: 0.5, pointerEvents: 'none' }}>
          <textarea
            name="resolution"
            disabled
            rows={4}
            placeholder="Root cause, fix applied, or summary..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0px',
              border: '1px solid #e2e8f0',
              resize: 'vertical',
              background: '#f3f4f6',
              fontSize: '0.9rem',
            }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            10-1000 chars. Supports **bold**, *italic*, `code`, links.
          </div>
          <button
            type="button"
            disabled
            className="glass-button primary"
            style={{ width: '100%', opacity: 0.5, borderRadius: '0px' }}
          >
            Resolve with Note
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e6e8ef',
        borderRadius: '0px',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h4 style={{ fontWeight: '700' }}>Resolution</h4>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Required
        </span>
      </div>
      <form action={onResolve} style={{ display: 'grid', gap: '0.75rem' }}>
        <textarea
          name="resolution"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder="Root cause, fix applied, or summary..."
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '0px',
            border: '1px solid var(--border)',
            resize: 'vertical',
            background: '#fff',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          10-1000 chars. Supports **bold**, *italic*, `code`, links.
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}
