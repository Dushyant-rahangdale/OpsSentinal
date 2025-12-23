'use client';

import { useState, useEffect, useActionState } from 'react';
import Link from 'next/link';
import { createIncident } from '@/app/(app)/incidents/actions';
import CustomFieldInput from '@/components/CustomFieldInput';

type Service = {
    id: string;
    name: string;
};

type User = {
    id: string;
    name: string;
    email: string;
};

type Template = {
    id: string;
    name: string;
    title: string;
    descriptionText?: string | null;
    defaultUrgency: 'HIGH' | 'LOW';
    defaultPriority?: string | null;
    defaultService?: { id: string; name: string } | null;
};

type CustomField = {
    id: string;
    name: string;
    key: string;
    type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL';
    required: boolean;
    defaultValue?: string | null;
    options?: any;
};

type CreateIncidentFormProps = {
    services: Service[];
    users: User[];
    templates: Template[];
    selectedTemplateId: string | null;
    selectedTemplate?: Template | null;
    customFields?: CustomField[];
};

export default function CreateIncidentForm({
    services,
    users,
    templates,
    selectedTemplateId,
    selectedTemplate: propSelectedTemplate,
    customFields = []
}: CreateIncidentFormProps) {
    const selectedTemplate = propSelectedTemplate || (selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null);

    const [title, setTitle] = useState(selectedTemplate?.title || '');
    const [description, setDescription] = useState(selectedTemplate?.descriptionText || '');
    const [serviceId, setServiceId] = useState(selectedTemplate?.defaultService?.id || '');
    const [urgency, setUrgency] = useState<'HIGH' | 'LOW'>(selectedTemplate?.defaultUrgency || 'HIGH');
    const [priority, setPriority] = useState(selectedTemplate?.defaultPriority || '');
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    
    // Wrap server action with useActionState to avoid serialization issues
    // Since createIncident redirects, we don't need to handle state
    const [state, formAction, isPending] = useActionState(async (prevState: null, formData: FormData) => {
        await createIncident(formData);
        return null; // This won't be reached due to redirect, but satisfies the type
    }, null);

    // Update form when template changes (from URL or direct selection)
    useEffect(() => {
        if (selectedTemplate) {
            setTitle(selectedTemplate.title);
            setDescription(selectedTemplate.descriptionText || '');
            setServiceId(selectedTemplate.defaultService?.id || '');
            setUrgency(selectedTemplate.defaultUrgency);
            setPriority(selectedTemplate.defaultPriority || '');
        }
    }, [selectedTemplate]); // Watch for selectedTemplate changes

    return (
        <form id="incident-create-form" action={formAction} style={{ display: 'grid', gap: '2rem' }}>
            {/* Basic Information */}
            <section>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                    Basic Information
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Title <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                            name="title"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={500}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit'
                            }}
                            placeholder="e.g., API Latency Spike in EU Region"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Description
                            {description.length > 0 && (
                                <span style={{ float: 'right', fontSize: '0.75rem', color: description.length > 9500 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '400' }}>
                                    {description.length}/10,000
                                </span>
                            )}
                        </label>
                        <textarea
                            name="description"
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={10000}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                resize: 'vertical',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit'
                            }}
                            placeholder="Impact summary, customer-facing symptoms, affected services, key metrics..."
                        />
                    </div>
                </div>
            </section>

            {/* Classification & Routing */}
            <section>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                    Classification & Routing
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Service <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <select
                            name="serviceId"
                            required
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Select a service...</option>
                            {services.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                Urgency
                            </label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '0px', background: urgency === 'HIGH' ? '#feecec' : '#fff', transition: 'all 0.15s' }}>
                                    <input 
                                        type="radio" 
                                        name="urgency" 
                                        value="HIGH" 
                                        checked={urgency === 'HIGH'}
                                        onChange={(e) => setUrgency(e.target.value as 'HIGH')}
                                        style={{ margin: 0, cursor: 'pointer' }} 
                                    />
                                    <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>High</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '0px', background: urgency === 'LOW' ? '#fff4cc' : '#fff', transition: 'all 0.15s' }}>
                                    <input 
                                        type="radio" 
                                        name="urgency" 
                                        value="LOW" 
                                        checked={urgency === 'LOW'}
                                        onChange={(e) => setUrgency(e.target.value as 'LOW')}
                                        style={{ margin: 0, cursor: 'pointer' }} 
                                    />
                                    <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.9rem' }}>Low</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                Priority
                            </label>
                            <select
                                name="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0px',
                                    background: '#fff',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">Auto (Default)</option>
                                <option value="P1">P1 - Critical</option>
                                <option value="P2">P2 - High</option>
                                <option value="P3">P3 - Medium</option>
                                <option value="P4">P4 - Low</option>
                                <option value="P5">P5 - Informational</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Assignee (Optional)
                        </label>
                        <select
                            name="assigneeId"
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                background: '#fff',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Leave unassigned to let the escalation policy route it automatically.
                        </p>
                    </div>
                </div>
            </section>

            {/* Custom Fields */}
            {customFields.length > 0 && (
                <section>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                        Custom Fields
                    </h2>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {customFields.map((field) => (
                            <div key={field.id}>
                                <input type="hidden" name={`customField_${field.id}`} value={customFieldValues[field.id] || field.defaultValue || ''} />
                                <CustomFieldInput
                                    field={field}
                                    value={customFieldValues[field.id] || ''}
                                    onChange={(value) => setCustomFieldValues({ ...customFieldValues, [field.id]: value })}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Advanced Options */}
            <section>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                    Advanced Options
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Deduplication Key
                        </label>
                        <input
                            name="dedupKey"
                            maxLength={200}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '0px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.95rem',
                                fontFamily: 'inherit'
                            }}
                            placeholder="e.g., api-latency-eu-2024"
                        />
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Use the same key for related incidents to prevent duplicates. Leave empty to allow duplicates.
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Notifications
                        </label>
                        <div style={{ display: 'grid', gap: '0.75rem', padding: '1rem', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '0px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="checkbox" name="notifyOnCall" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Notify on-call responders immediately</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="checkbox" name="notifySlack" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Post to service Slack channel</span>
                            </label>
                        </div>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            These notifications will be sent when the incident is created.
                        </p>
                    </div>
                </div>
            </section>

            {/* Create Incident Button - Bottom */}
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Link href="/incidents" className="glass-button" style={{ textDecoration: 'none', borderRadius: '0px' }}>
                    Cancel
                </Link>
                <button type="submit" className="glass-button primary" style={{ borderRadius: '0px' }} disabled={isPending}>
                    {isPending ? 'Creating...' : 'Create Incident'}
                </button>
            </div>
        </form>
    );
}
