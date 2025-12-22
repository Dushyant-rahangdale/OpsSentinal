'use client';

import { useState, useTransition } from 'react';
import { upsertPostmortem, type PostmortemData } from '@/app/(app)/postmortems/actions';
import { Button, Card, FormField } from '@/components/ui';
import { useRouter } from 'next/navigation';
import PostmortemTimelineBuilder, { type TimelineEvent } from './postmortem/PostmortemTimelineBuilder';
import PostmortemImpactInput, { type ImpactMetrics } from './postmortem/PostmortemImpactInput';
import PostmortemActionItems, { type ActionItem } from './postmortem/PostmortemActionItems';

type PostmortemFormProps = {
    incidentId: string;
    initialData?: {
        id: string;
        title: string;
        summary?: string | null;
        timeline?: any;
        impact?: any;
        rootCause?: string | null;
        resolution?: string | null;
        actionItems?: any;
        lessons?: string | null;
        status?: string;
    };
    users?: Array<{ id: string; name: string; email: string }>;
    resolvedIncidents?: Array<{
        id: string;
        title: string;
        resolvedAt: Date | null;
        service: {
            name: string;
        };
    }>;
};

export default function PostmortemForm({ incidentId, initialData, users = [], resolvedIncidents = [] }: PostmortemFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidentId || '');

    // Parse initial data with proper types
    const parseTimeline = (timeline: any): TimelineEvent[] => {
        if (!timeline || !Array.isArray(timeline)) return [];
        return timeline.map((e: any) => ({
            id: e.id || `event-${Date.now()}-${Math.random()}`,
            timestamp: e.timestamp || new Date().toISOString(),
            type: e.type || 'DETECTION',
            title: e.title || '',
            description: e.description || '',
            actor: e.actor,
        }));
    };

    const parseImpact = (impact: any): ImpactMetrics => {
        if (!impact || typeof impact !== 'object') return {};
        return {
            usersAffected: impact.usersAffected,
            downtimeMinutes: impact.downtimeMinutes,
            errorRate: impact.errorRate,
            servicesAffected: Array.isArray(impact.servicesAffected) ? impact.servicesAffected : [],
            slaBreaches: impact.slaBreaches,
            revenueImpact: impact.revenueImpact,
            apiErrors: impact.apiErrors,
            performanceDegradation: impact.performanceDegradation,
        };
    };

    const parseActionItems = (actionItems: any): ActionItem[] => {
        if (!actionItems || !Array.isArray(actionItems)) return [];
        return actionItems.map((item: any) => ({
            id: item.id || `action-${Date.now()}-${Math.random()}`,
            title: item.title || '',
            description: item.description || '',
            owner: item.owner,
            dueDate: item.dueDate,
            status: item.status || 'OPEN',
            priority: item.priority || 'MEDIUM',
        }));
    };

    const [formData, setFormData] = useState<PostmortemData>({
        title: initialData?.title || '',
        summary: initialData?.summary || '',
        rootCause: initialData?.rootCause || '',
        resolution: initialData?.resolution || '',
        lessons: initialData?.lessons || '',
        status: (initialData?.status as any) || 'DRAFT',
        timeline: initialData?.timeline || [],
        impact: initialData?.impact || {},
        actionItems: initialData?.actionItems || [],
    });

    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(parseTimeline(initialData?.timeline));
    const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics>(parseImpact(initialData?.impact));
    const [actionItems, setActionItems] = useState<ActionItem[]>(parseActionItems(initialData?.actionItems));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const targetIncidentId = selectedIncidentId || incidentId;

        if (!targetIncidentId) {
            setError('Please select an incident');
            return;
        }

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        // Combine all data before submitting
        const submitData: PostmortemData = {
            ...formData,
            timeline: timelineEvents,
            impact: impactMetrics,
            actionItems: actionItems,
        };

        startTransition(async () => {
            try {
                const result = await upsertPostmortem(targetIncidentId, submitData);
                if (result.success) {
                    router.push(`/postmortems/${targetIncidentId}`);
                    router.refresh();
                } else {
                    setError('Failed to save postmortem');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to save postmortem');
            }
        });
    };

    const selectedIncident = resolvedIncidents.find(inc => inc.id === selectedIncidentId);

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                {/* Incident Selection - Only show if no incidentId provided and we have resolved incidents */}
                {!incidentId && resolvedIncidents.length > 0 && (
                    <div className="glass-panel" style={{ 
                        padding: 'var(--spacing-6)', 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    }}>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                            Select Incident
                        </h2>
                        <FormField
                            label="Resolved Incident"
                            type="select"
                            required
                            value={selectedIncidentId}
                            onChange={(e) => setSelectedIncidentId(e.target.value)}
                            options={resolvedIncidents.map(incident => ({
                                value: incident.id,
                                label: `${incident.title} (${incident.service.name}) - Resolved ${incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleDateString() : 'N/A'}`,
                            }))}
                            placeholder="Select a resolved incident..."
                            helperText="Choose the incident for which you want to create a postmortem"
                        />
                        {selectedIncident && (
                            <div style={{ 
                                marginTop: 'var(--spacing-3)',
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-info-light)20',
                                border: '1px solid var(--color-info-light)40',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <strong>Selected:</strong> {selectedIncident.title}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-1)' }}>
                                    Service: {selectedIncident.service.name} • Resolved: {selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Basic Information */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                        Basic Information
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        <FormField
                            type="input"
                            label="Title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Database Connection Pool Exhaustion"
                        />

                        <FormField
                            label="Executive Summary"
                            type="textarea"
                            rows={4}
                            value={formData.summary || ''}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            helperText="Brief overview of the incident and its impact"
                            placeholder="Provide a high-level summary for stakeholders..."
                        />

                        <FormField
                            label="Status"
                            type="select"
                            value={formData.status || 'DRAFT'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            options={[
                                { value: 'DRAFT', label: 'Draft' },
                                { value: 'PUBLISHED', label: 'Published' },
                                { value: 'ARCHIVED', label: 'Archived' },
                            ]}
                        />
                    </div>
                </div>

                {/* Timeline */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                        Incident Timeline
                    </h2>
                    <PostmortemTimelineBuilder 
                        events={timelineEvents} 
                        onChange={setTimelineEvents} 
                    />
                </div>

                {/* Impact Metrics */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <PostmortemImpactInput 
                        metrics={impactMetrics} 
                        onChange={setImpactMetrics} 
                    />
                </div>

                {/* Root Cause & Resolution */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                        Analysis
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                        <FormField
                            label="Root Cause Analysis"
                            type="textarea"
                            rows={6}
                            value={formData.rootCause || ''}
                            onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                            helperText="What was the underlying cause of this incident?"
                            placeholder="Describe the root cause in detail..."
                        />

                        <FormField
                            label="Resolution"
                            type="textarea"
                            rows={4}
                            value={formData.resolution || ''}
                            onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                            helperText="How was the incident resolved?"
                            placeholder="Describe the steps taken to resolve the incident..."
                        />
                    </div>
                </div>

                {/* Action Items */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <PostmortemActionItems 
                        actionItems={actionItems} 
                        onChange={setActionItems}
                        users={users}
                    />
                </div>

                {/* Lessons Learned */}
                <div className="glass-panel" style={{ 
                    padding: 'var(--spacing-6)', 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                        Lessons Learned
                    </h2>
                    <FormField
                        label="Lessons Learned"
                        type="textarea"
                        rows={6}
                        value={formData.lessons || ''}
                        onChange={(e) => setFormData({ ...formData, lessons: e.target.value })}
                        helperText="What did we learn? How can we prevent this in the future?"
                        placeholder="Document key learnings and preventive measures..."
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
                        onClick={() => router.back()}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isPending}
                    >
                        {initialData ? 'Update' : 'Create'} Postmortem
                    </Button>
                </div>
            </div>
        </form>
    );
}

