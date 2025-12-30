'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, FormField, Switch, Select, Modal, Badge } from '@/components/ui';
import { type FilterCriteria } from '@/lib/search-presets';

type SearchPreset = {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  isShared: boolean;
  isDefault: boolean;
  isPublic: boolean;
  filterCriteria: FilterCriteria;
  icon: string | null;
  color: string | null;
  order: number;
  usageCount: number;
  lastUsedAt: Date | null;
  sharedWithTeams: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

type SearchPresetManagerProps = {
  presets: SearchPreset[];
  services: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  teams: Array<{ id: string; name: string }>;
  currentUserId: string;
  isAdmin: boolean;
};

const PRESET_ICONS = [
  { value: '', label: 'None' },
  { value: 'filter', label: '🔍 Filter' },
  { value: 'star', label: '⭐ Star' },
  { value: 'fire', label: '🔥 Fire' },
  { value: 'clock', label: '⏰ Clock' },
  { value: 'check', label: '✓ Check' },
  { value: 'alert', label: '⚠️ Alert' },
  { value: 'tag', label: '🏷️ Tag' },
  { value: 'user', label: '👤 User' },
  { value: 'team', label: '👥 Team' },
];

const PRESET_COLORS = [
  { value: '', label: 'Default' },
  { value: '#d32f2f', label: 'Red' },
  { value: '#1976d2', label: 'Blue' },
  { value: '#388e3c', label: 'Green' },
  { value: '#f57c00', label: 'Orange' },
  { value: '#7b1fa2', label: 'Purple' },
  { value: '#0288d1', label: 'Cyan' },
  { value: '#c2185b', label: 'Pink' },
];

export default function SearchPresetManager({
  presets: initialPresets,
  services: _services,
  users: _users,
  teams: _teams,
  currentUserId,
  isAdmin,
}: SearchPresetManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [presets, _setPresets] = useState(initialPresets);
  const [editingPreset, setEditingPreset] = useState<SearchPreset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    filterCriteria: {
      filter: 'all_open',
      search: '',
      priority: 'all',
      urgency: 'all',
      sort: 'newest',
      serviceIds: [] as string[],
      assigneeIds: [] as string[],
      statuses: [] as string[],
    } as FilterCriteria,
    isShared: false,
    isPublic: false,
    icon: '',
    color: '',
    sharedWithTeams: [] as string[],
  });

  useEffect(() => {
    if (editingPreset) {
      setFormData({
        name: editingPreset.name,
        description: editingPreset.description || '',
        filterCriteria: editingPreset.filterCriteria,
        isShared: editingPreset.isShared,
        isPublic: editingPreset.isPublic,
        icon: editingPreset.icon || '',
        color: editingPreset.color || '',
        sharedWithTeams: editingPreset.sharedWithTeams,
      });
      setShowCreateModal(true);
    }
  }, [editingPreset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Preset name is required');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingPreset
          ? `/api/search-presets/${editingPreset.id}`
          : '/api/search-presets';

        const method = editingPreset ? 'PATCH' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            description: formData.description || null,
            icon: formData.icon || null,
            color: formData.color || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save preset');
        }

        router.refresh();
        setShowCreateModal(false);
        setEditingPreset(null);
        setFormData({
          name: '',
          description: '',
          filterCriteria: {
            filter: 'all_open',
            search: '',
            priority: 'all',
            urgency: 'all',
            sort: 'newest',
            serviceIds: [],
            assigneeIds: [],
            statuses: [],
          },
          isShared: false,
          isPublic: false,
          icon: '',
          color: '',
          sharedWithTeams: [],
        });
      } catch (err: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message || 'Failed to save preset');
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/search-presets/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete preset');
        }

        router.refresh();
        setShowDeleteConfirm(null);
      } catch (err: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message || 'Failed to delete preset');
      }
    });
  };

  const handleDuplicate = async (preset: SearchPreset) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/search-presets/${preset.id}/duplicate`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to duplicate preset');
        }

        router.refresh();
      } catch (err: any) {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message || 'Failed to duplicate preset');
      }
    });
  };

  const myPresets = presets.filter(p => p.createdById === currentUserId);
  const sharedPresets = presets.filter(p => p.isShared && p.createdById !== currentUserId);
  const publicPresets = presets.filter(p => p.isPublic && !p.isShared);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Saved Searches
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Save and reuse common filter combinations for quick access
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingPreset(null);
            setFormData({
              name: '',
              description: '',
              filterCriteria: {
                filter: 'all_open',
                search: '',
                priority: 'all',
                urgency: 'all',
                sort: 'newest',
                serviceIds: [],
                assigneeIds: [],
                statuses: [],
              },
              isShared: false,
              isPublic: false,
              icon: '',
              color: '',
              sharedWithTeams: [],
            });
            setShowCreateModal(true);
          }}
        >
          + Create Preset
        </Button>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--spacing-3)',
            background: 'var(--color-error-light)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error-dark)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {error}
        </div>
      )}

      {/* My Presets */}
      <Card>
        <div style={{ padding: 'var(--spacing-5)' }}>
          <h3
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            My Presets ({myPresets.length})
          </h3>
          {myPresets.length === 0 ? (
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-sm)',
                padding: 'var(--spacing-4)',
              }}
            >
              No saved presets. Create one to get started.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              {myPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onEdit={() => setEditingPreset(preset)}
                  onDelete={() => setShowDeleteConfirm(preset.id)}
                  onDuplicate={() => handleDuplicate(preset)}
                  canEdit={preset.createdById === currentUserId || isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Shared Presets */}
      {sharedPresets.length > 0 && (
        <Card>
          <div style={{ padding: 'var(--spacing-5)' }}>
            <h3
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              Shared Presets ({sharedPresets.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              {sharedPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onEdit={() => setEditingPreset(preset)}
                  onDelete={() => setShowDeleteConfirm(preset.id)}
                  onDuplicate={() => handleDuplicate(preset)}
                  canEdit={false}
                  showCreator
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Public Presets */}
      {publicPresets.length > 0 && (
        <Card>
          <div style={{ padding: 'var(--spacing-5)' }}>
            <h3
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-4)',
              }}
            >
              Public Presets ({publicPresets.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              {publicPresets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onEdit={() => setEditingPreset(preset)}
                  onDelete={() => setShowDeleteConfirm(preset.id)}
                  onDuplicate={() => handleDuplicate(preset)}
                  canEdit={isAdmin}
                  showCreator
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPreset(null);
            setError(null);
          }}
          title={editingPreset ? 'Edit Preset' : 'Create Preset'}
          size="lg"
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
          >
            <FormField
              type="input"
              label="Preset Name *"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., My Open Incidents"
            />

            <FormField
              type="textarea"
              label="Description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />

            {/* Filter Criteria */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-4)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-3)',
                }}
              >
                Filter Criteria
              </h4>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--spacing-2)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Status Filter
                  </label>
                  <Select
                    value={formData.filterCriteria.filter || 'all_open'}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        filterCriteria: { ...formData.filterCriteria, filter: e.target.value },
                      })
                    }
                    options={[
                      { value: 'all_open', label: 'All Open' },
                      { value: 'mine', label: 'My Incidents' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'snoozed', label: 'Snoozed' },
                      { value: 'suppressed', label: 'Suppressed' },
                    ]}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--spacing-2)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Priority
                  </label>
                  <Select
                    value={formData.filterCriteria.priority || 'all'}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        filterCriteria: { ...formData.filterCriteria, priority: e.target.value },
                      })
                    }
                    options={[
                      { value: 'all', label: 'All Priorities' },
                      { value: 'P1', label: 'P1 - Critical' },
                      { value: 'P2', label: 'P2 - High' },
                      { value: 'P3', label: 'P3 - Medium' },
                      { value: 'P4', label: 'P4 - Low' },
                      { value: 'P5', label: 'P5 - Info' },
                    ]}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--spacing-2)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Urgency
                  </label>
                  <Select
                    value={formData.filterCriteria.urgency || 'all'}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        filterCriteria: { ...formData.filterCriteria, urgency: e.target.value },
                      })
                    }
                    options={[
                      { value: 'all', label: 'All Urgencies' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'LOW', label: 'Low' },
                    ]}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 'var(--spacing-2)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Sort By
                  </label>
                  <Select
                    value={formData.filterCriteria.sort || 'newest'}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        filterCriteria: { ...formData.filterCriteria, sort: e.target.value },
                      })
                    }
                    options={[
                      { value: 'newest', label: 'Newest First' },
                      { value: 'oldest', label: 'Oldest First' },
                      { value: 'priority', label: 'Priority' },
                      { value: 'status', label: 'Status' },
                      { value: 'updated', label: 'Recently Updated' },
                    ]}
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--spacing-3)' }}>
                <FormField
                  type="input"
                  label="Search Query"
                  value={formData.filterCriteria.search || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      filterCriteria: { ...formData.filterCriteria, search: e.target.value },
                    })
                  }
                  placeholder="Optional search term"
                />
              </div>
            </div>

            {/* Visual Settings */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Icon
                </label>
                <Select
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  options={PRESET_ICONS}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 'var(--spacing-2)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Color
                </label>
                <Select
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  options={PRESET_COLORS}
                />
              </div>
            </div>

            {/* Sharing Options */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-4)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-3)',
                }}
              >
                Sharing Options
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <Switch
                  checked={formData.isShared}
                  onChange={checked => setFormData({ ...formData, isShared: checked })}
                  label="Share with my teams"
                />
                {isAdmin && (
                  <Switch
                    checked={formData.isPublic}
                    onChange={checked => setFormData({ ...formData, isPublic: checked })}
                    label="Make public (visible to all users)"
                  />
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-3)',
                justifyContent: 'flex-end',
                marginTop: 'var(--spacing-2)',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPreset(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isPending}>
                {editingPreset ? 'Update Preset' : 'Create Preset'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete Preset"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this preset? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(showDeleteConfirm)}
                isLoading={isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PresetCard({
  preset,
  onEdit,
  onDelete,
  onDuplicate,
  canEdit,
  showCreator = false,
}: {
  preset: SearchPreset;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  canEdit: boolean;
  showCreator?: boolean;
}) {
  const criteria = preset.filterCriteria;
  const criteriaText = [
    criteria.filter && criteria.filter !== 'all_open' && `Filter: ${criteria.filter}`,
    criteria.priority && criteria.priority !== 'all' && `Priority: ${criteria.priority}`,
    criteria.urgency && criteria.urgency !== 'all' && `Urgency: ${criteria.urgency}`,
    criteria.sort && criteria.sort !== 'newest' && `Sort: ${criteria.sort}`,
    criteria.search && `Search: "${criteria.search}"`,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      style={{
        padding: 'var(--spacing-4)',
        background: 'var(--color-neutral-50)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-neutral-200)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 'var(--spacing-4)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          {preset.icon && <span style={{ fontSize: '1.2rem' }}>{preset.icon}</span>}
          <h4
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: preset.color || 'var(--text-primary)',
            }}
          >
            {preset.name}
          </h4>
          {preset.isPublic && (
            <Badge variant="info" size="sm">
              Public
            </Badge>
          )}
          {preset.isShared && !preset.isPublic && (
            <Badge variant="default" size="sm">
              Shared
            </Badge>
          )}
          {preset.usageCount > 0 && (
            <Badge variant="default" size="sm">
              Used {preset.usageCount} time{preset.usageCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {preset.description && (
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {preset.description}
          </p>
        )}
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          {criteriaText || 'Default filters'}
        </p>
        {showCreator && (
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              marginTop: 'var(--spacing-1)',
            }}
          >
            By {preset.createdBy.name}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate">
          📋
        </Button>
        {canEdit && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
              ✏️
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
              🗑️
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
