'use client';

import NoteCard from '../NoteCard';

type Note = {
  id: string;
  content: string;
  user: { name: string; email: string };
  createdAt: Date;
};

type IncidentNotesProps = {
  notes: Note[];
  canManage: boolean;
  onAddNote: (formData: FormData) => void;
};

export default function IncidentNotes({ notes, canManage, onAddNote }: IncidentNotesProps) {
  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        marginBottom: '2rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e6e8ef',
        borderRadius: '0px',
        boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.35rem',
              color: 'var(--text-primary)',
            }}
          >
            Notes
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Decision trail and responder context
          </div>
        </div>
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 600,
            padding: '0.35rem 0.75rem',
            background: '#f9fafb',
            border: '1px solid var(--border)',
            borderRadius: '0px',
          }}
        >
          Collaboration
        </div>
      </div>

      {/* Notes List */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}
      >
        {notes.map(note => (
          <NoteCard
            key={note.id}
            content={note.content}
            userName={note.user.name}
            createdAt={note.createdAt}
            isResolution={note.content.startsWith('Resolution:')}
          />
        ))}
        {notes.length === 0 && (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              background: '#f9fafb',
              border: '1px dashed var(--border)',
              borderRadius: '0px',
            }}
          >
            No notes added yet. Start the conversation by adding a note.
          </div>
        )}
      </div>

      {/* Add Note Form */}
      {canManage ? (
        <form action={onAddNote} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea
              name="content"
              placeholder="Add a note... (supports **bold**, *italic*, `code`, links)"
              required
              rows={3}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0px',
                border: '1px solid var(--border)',
                background: '#fff',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supports Markdown formatting
            </div>
          </div>
          <button
            className="glass-button primary"
            type="submit"
            style={{
              alignSelf: 'flex-start',
              padding: '0.875rem 1.5rem',
              borderRadius: '0px',
              fontWeight: 600,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            Post Note
          </button>
        </form>
      ) : (
        <div
          style={{
            padding: '1rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0px',
            opacity: 0.7,
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            ⚠️ You don't have access to add notes. Responder role or above required.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.5, pointerEvents: 'none' }}>
            <textarea
              name="content"
              placeholder="Add a note..."
              disabled
              rows={3}
              style={{
                flex: 1,
                padding: '0.875rem',
                borderRadius: '0px',
                border: '1px solid #e2e8f0',
                background: '#f3f4f6',
                fontSize: '0.9rem',
              }}
            />
            <button
              className="glass-button primary"
              disabled
              style={{ opacity: 0.5, padding: '0.875rem 1.5rem', borderRadius: '0px' }}
            >
              Post Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
