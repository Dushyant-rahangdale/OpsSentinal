'use client';

import Link from 'next/link';
import PostmortemTimeline, { type TimelineEvent } from './PostmortemTimeline';
import PostmortemImpactMetrics from './PostmortemImpactMetrics';
import type { ImpactMetrics } from './PostmortemImpactInput';
import type { ActionItem } from './PostmortemActionItems';
import { Badge, Button } from '@/components/ui';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

interface PostmortemDetailViewProps {
  postmortem: {
    id: string;
    title: string;
    summary?: string | null;
    timeline?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    impact?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    rootCause?: string | null;
    resolution?: string | null;
    actionItems?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    lessons?: string | null;
    status?: string;
    createdAt: Date;
    publishedAt?: Date | null;
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
    incident: {
      id: string;
      title: string;
      resolvedAt?: Date | null;
    };
  };
  users?: Array<{ id: string; name: string; email: string }>;
  canEdit?: boolean;
  incidentId: string;
}

const _STATUS_COLORS = {
  DRAFT: '#6b7280',
  PUBLISHED: '#22c55e',
  ARCHIVED: '#9ca3af',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export default function PostmortemDetailView({
  postmortem,
  users = [],
  canEdit = false,
  incidentId,
}: PostmortemDetailViewProps) {
  const { userTimeZone } = useTimezone();

  // Parse data
  const parseTimeline = (timeline: any): TimelineEvent[] => {
    if (!timeline || !Array.isArray(timeline)) return [];
    return timeline.map((e: any) => ({
      id: e.id || `event-${Date.now()}`,
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
      id: item.id || `action-${Date.now()}`,
      title: item.title || '',
      description: item.description || '',
      owner: item.owner,
      dueDate: item.dueDate,
      status: item.status || 'OPEN',
      priority: item.priority || 'MEDIUM',
    }));
  };

  const timelineEvents = parseTimeline(postmortem.timeline);
  const impactMetrics = parseImpact(postmortem.impact);
  const actionItems = parseActionItems(postmortem.actionItems);

  const completedActions = actionItems.filter(item => item.status === 'COMPLETED').length;
  const totalActions = actionItems.length;
  const completionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Hero Section */}
      <div
        className="glass-panel"
        style={{
          padding: 'var(--spacing-8)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(211, 47, 47, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(30%, -30%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                marginBottom: 'var(--spacing-3)',
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {postmortem.title}
            </h1>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-base)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Postmortem for{' '}
              <Link
                href={`/incidents/${postmortem.incident.id}`}
                style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}
              >
                {postmortem.incident.title}
              </Link>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <Badge
              variant={
                postmortem.status === 'PUBLISHED'
                  ? 'success'
                  : postmortem.status === 'ARCHIVED'
                    ? 'default'
                    : 'warning'
              }
            >
              {STATUS_LABELS[postmortem.status as keyof typeof STATUS_LABELS] || postmortem.status}
            </Badge>
            {canEdit && (
              <Link href={`/postmortems/${incidentId}?edit=true`}>
                <Button variant="primary">Edit Postmortem</Button>
              </Link>
            )}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-4)',
            paddingTop: 'var(--spacing-4)',
            borderTop: '1px solid #e2e8f0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            Created by <strong>{postmortem.createdBy.name}</strong>
          </span>
          <span>•</span>
          <span>{formatDateTime(postmortem.createdAt, userTimeZone, { format: 'date' })}</span>
          {postmortem.publishedAt && (
            <>
              <span>•</span>
              <span>
                Published {formatDateTime(postmortem.publishedAt, userTimeZone, { format: 'date' })}
              </span>
            </>
          )}
          {postmortem.incident.resolvedAt && (
            <>
              <span>•</span>
              <span>
                Resolved{' '}
                {formatDateTime(postmortem.incident.resolvedAt, userTimeZone, { format: 'date' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {postmortem.summary && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-8)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '700',
              marginBottom: 'var(--spacing-4)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '24px',
                background: 'linear-gradient(180deg, var(--primary-color) 0%, #ef4444 100%)',
                borderRadius: '2px',
              }}
            />
            Executive Summary
          </h2>
          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              fontSize: 'var(--font-size-base)',
              paddingLeft: 'var(--spacing-6)',
            }}
          >
            {postmortem.summary}
          </p>
        </div>
      )}

      {/* Timeline */}
      {timelineEvents.length > 0 && (
        <PostmortemTimeline
          events={timelineEvents}
          incidentStartTime={
            postmortem.incident.resolvedAt ? undefined : new Date(postmortem.createdAt)
          }
          incidentEndTime={postmortem.incident.resolvedAt || undefined}
        />
      )}

      {/* Impact Metrics */}
      {Object.keys(impactMetrics).length > 0 && <PostmortemImpactMetrics metrics={impactMetrics} />}

      {/* Root Cause & Resolution */}
      {(postmortem.rootCause || postmortem.resolution) && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-6)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '700',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            Analysis
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {postmortem.rootCause && (
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Root Cause
                </h3>
                <p
                  style={{
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                  }}
                >
                  {postmortem.rootCause}
                </p>
              </div>
            )}
            {postmortem.resolution && (
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-2)',
                  }}
                >
                  Resolution
                </h3>
                <p
                  style={{
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                  }}
                >
                  {postmortem.resolution}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-6)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Action Items</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                {completedActions}/{totalActions} completed
              </span>
              <div
                style={{
                  width: '100px',
                  height: '8px',
                  background: '#e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${completionRate}%`,
                    height: '100%',
                    background: completionRate === 100 ? '#22c55e' : '#3b82f6',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {actionItems.map(item => {
              const owner = users.find(u => u.id === item.owner);
              const isOverdue =
                item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED';
              const statusColors = {
                OPEN: '#3b82f6',
                IN_PROGRESS: '#f59e0b',
                COMPLETED: '#22c55e',
                BLOCKED: '#ef4444',
              };
              const priorityColors = {
                HIGH: '#ef4444',
                MEDIUM: '#f59e0b',
                LOW: '#6b7280',
              };

              return (
                <div
                  key={item.id}
                  style={{
                    padding: 'var(--spacing-4)',
                    background: 'white',
                    border: `2px solid ${statusColors[item.status]}40`,
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `4px solid ${statusColors[item.status]}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: 'var(--spacing-2)',
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
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: '600',
                            background: `${statusColors[item.status]}20`,
                            color: statusColors[item.status],
                          }}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: '600',
                            background: `${priorityColors[item.priority]}20`,
                            color: priorityColors[item.priority],
                          }}
                        >
                          {item.priority} Priority
                        </span>
                        {isOverdue && (
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: '600',
                              background: '#ef444420',
                              color: '#ef4444',
                            }}
                          >
                            Overdue
                          </span>
                        )}
                      </div>
                      <h4
                        style={{
                          fontSize: 'var(--font-size-base)',
                          fontWeight: '600',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        {item.title}
                      </h4>
                      {item.description && (
                        <p
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--spacing-1)',
                          }}
                        >
                          {item.description}
                        </p>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          gap: 'var(--spacing-3)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {owner && <span>👤 {owner.name}</span>}
                        {item.dueDate && (
                          <span>
                            📅 Due: {formatDateTime(item.dueDate, userTimeZone, { format: 'date' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lessons Learned */}
      {postmortem.lessons && (
        <div
          className="glass-panel"
          style={{
            padding: 'var(--spacing-6)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: '700',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            Lessons Learned
          </h2>
          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              fontSize: 'var(--font-size-base)',
            }}
          >
            {postmortem.lessons}
          </p>
        </div>
      )}
    </div>
  );
}
