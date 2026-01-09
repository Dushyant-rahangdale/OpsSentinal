'use client';

import _TimelineEvent from '../TimelineEvent';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Clock, AlertCircle, CheckCircle2, Target, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type Event = {
  id: string;
  message: string;
  createdAt: Date;
};

type IncidentTimelineProps = {
  events: Event[];
  incidentCreatedAt?: Date;
  incidentAcknowledgedAt?: Date | null;
  incidentResolvedAt?: Date | null;
};

export default function IncidentTimeline({
  events,
  incidentCreatedAt,
  incidentAcknowledgedAt,
  incidentResolvedAt,
}: IncidentTimelineProps) {
  const { userTimeZone } = useTimezone();

  const formatEscalationMessage = (message: string) => {
    const match = message.match(/\[\[scheduledAt=([^\]]+)\]\]/);
    if (!match) {
      return message;
    }

    const scheduledAtRaw = match[1];
    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return message.replace(match[0], scheduledAtRaw);
    }

    const formatted = formatDateTime(scheduledAt, userTimeZone, { format: 'datetime' });
    return message.replace(match[0], formatted);
  };

  // Create a comprehensive timeline with incident lifecycle events
  const timelineEvents: Array<{
    id: string;
    message: string;
    createdAt: Date;
    type: 'CREATED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EVENT';
    icon?: string;
  }> = [];

  // Add incident creation
  if (incidentCreatedAt) {
    timelineEvents.push({
      id: 'incident-created',
      message: 'Incident created',
      createdAt: incidentCreatedAt,
      type: 'CREATED',
      icon: '🚨',
    });
  }

  // Add acknowledgment
  if (incidentAcknowledgedAt) {
    timelineEvents.push({
      id: 'incident-acknowledged',
      message: 'Incident acknowledged',
      createdAt: incidentAcknowledgedAt,
      type: 'ACKNOWLEDGED',
      icon: '✅',
    });
  }

  // Add resolution
  if (incidentResolvedAt) {
    timelineEvents.push({
      id: 'incident-resolved',
      message: 'Incident resolved',
      createdAt: incidentResolvedAt,
      type: 'RESOLVED',
      icon: '🎯',
    });
  }

  // Add regular events
  events.forEach(event => {
    timelineEvents.push({
      ...event,
      type: 'EVENT',
    });
  });

  // Sort by date (oldest first for timeline)
  timelineEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Group events by date (using user's timezone)
  const groupedEvents = timelineEvents.reduce(
    (acc, event) => {
      const eventDate = new Date(event.createdAt);

      // Get current date in user's timezone
      const now = new Date();
      const todayStr = formatDateTime(now, userTimeZone, { format: 'date' });
      const eventDateStr = formatDateTime(eventDate, userTimeZone, { format: 'date' });

      let groupKey: string;
      if (eventDateStr === todayStr) {
        groupKey = 'Today';
      } else {
        // Get yesterday's date in user's timezone
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDateTime(yesterday, userTimeZone, { format: 'date' });

        if (eventDateStr === yesterdayStr) {
          groupKey = 'Yesterday';
        } else {
          // Use formatDateTime for timezone-aware date grouping
          // formatDateTime returns format like "Jan 15, 2024", convert to full month name
          const monthMap: Record<string, string> = {
            Jan: 'January',
            Feb: 'February',
            Mar: 'March',
            Apr: 'April',
            May: 'May',
            Jun: 'June',
            Jul: 'July',
            Aug: 'August',
            Sep: 'September',
            Oct: 'October',
            Nov: 'November',
            Dec: 'December',
          };
          // Split by comma to separate date and year
          const parts = eventDateStr.split(',');
          if (parts.length === 2) {
            const monthDay = parts[0].trim(); // "Jan 15"
            const year = parts[1].trim(); // "2024"
            const [monthAbbr, day] = monthDay.split(' ');
            const fullMonth = monthMap[monthAbbr] || monthAbbr;
            groupKey = `${fullMonth} ${day}, ${year}`;
          } else {
            // Fallback: use formatted string as-is
            groupKey = eventDateStr;
          }
        }
      }

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(event);
      return acc;
    },
    {} as Record<string, typeof timelineEvents>
  );

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'CREATED':
        return {
          color: 'bg-red-500',
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-700',
          ring: 'ring-red-500/20',
          icon: <AlertCircle className="h-3 w-3 text-white" />,
        };
      case 'ACKNOWLEDGED':
        return {
          color: 'bg-blue-500',
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          ring: 'ring-blue-500/20',
          icon: <CheckCircle2 className="h-3 w-3 text-white" />,
        };
      case 'RESOLVED':
        return {
          color: 'bg-green-500',
          border: 'border-green-200',
          bg: 'bg-green-50',
          text: 'text-green-700',
          ring: 'ring-green-500/20',
          icon: <Target className="h-3 w-3 text-white" />,
        };
      default:
        return {
          color: 'bg-neutral-500',
          border: 'border-neutral-200',
          bg: 'bg-white',
          text: 'text-neutral-700',
          ring: 'ring-neutral-500/20',
          icon: <Activity className="h-3 w-3 text-white" />,
        };
    }
  };

  return (
    <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
      <CardHeader className="bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white pb-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-0.5">Timeline</h3>
              <div className="text-sm text-white/90">
                Complete incident lifecycle and event history
              </div>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm font-semibold">
            {timelineEvents.length} Events
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {timelineEvents.length === 0 ? (
          <div className="py-12 px-8 text-center bg-neutral-50 border-2 border-dashed border-border rounded-lg">
            <Clock className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              No timeline events yet
            </p>
            <p className="text-xs text-muted-foreground">
              Events will appear here as the incident is updated.
            </p>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Gradient Timeline Line */}
            <div className="absolute left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-blue-500 to-green-500 rounded-full" />

            {Object.entries(groupedEvents).map(([groupKey, groupEvents], groupIndex) => (
              <div
                key={groupKey}
                className={cn(groupIndex < Object.keys(groupedEvents).length - 1 && 'mb-8')}
              >
                {/* Date Group Header */}
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border pl-6">
                  {groupKey}
                </div>

                {/* Events in Group */}
                <div className="space-y-0">
                  {groupEvents.map((event, index) => {
                    const _isFirst = index === 0 && groupIndex === 0;
                    const isLast =
                      index === groupEvents.length - 1 &&
                      groupIndex === Object.keys(groupedEvents).length - 1;
                    const config = getEventConfig(event.type);

                    return (
                      <div key={event.id} className={cn('relative pl-6', !isLast && 'pb-6')}>
                        {/* Connecting Line */}
                        {!isLast && (
                          <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-neutral-200" />
                        )}

                        {/* Timeline Dot with Icon */}
                        <div
                          className={cn(
                            'absolute left-1 top-2 w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10',
                            config.color,
                            'ring-4',
                            config.ring
                          )}
                        >
                          {config.icon}
                        </div>

                        {/* Event Content */}
                        <div>
                          {/* Event Meta */}
                          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground">
                            <Badge
                              variant="outline"
                              className={cn(
                                'px-2 py-0 text-xs font-bold uppercase tracking-wide',
                                config.bg,
                                config.text,
                                config.border
                              )}
                            >
                              {event.type === 'CREATED'
                                ? 'Created'
                                : event.type === 'ACKNOWLEDGED'
                                  ? 'Acknowledged'
                                  : event.type === 'RESOLVED'
                                    ? 'Resolved'
                                    : 'Event'}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(event.createdAt, userTimeZone, { format: 'time' })}
                            </span>
                            <span className="opacity-60">
                              {formatDateTime(event.createdAt, userTimeZone, { format: 'short' })}
                            </span>
                          </div>

                          {/* Event Message */}
                          <div
                            className={cn(
                              'rounded-lg p-4 border-2 shadow-sm',
                              event.type !== 'EVENT' ? config.bg : 'bg-white',
                              event.type !== 'EVENT' ? config.border : 'border-border',
                              'text-foreground leading-relaxed',
                              event.type !== 'EVENT' && 'font-semibold'
                            )}
                          >
                            {formatEscalationMessage(event.message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
