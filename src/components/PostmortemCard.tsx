'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import UserAvatar from '@/components/UserAvatar';
import { Clock, FileText, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type PostmortemCardProps = {
  postmortem: {
    id: string;
    incidentId: string;
    title: string;
    summary: string | null;
    status: string;
    createdAt: Date;
    publishedAt: Date | null;
    createdBy: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      gender?: string | null;
    };
    incident: {
      title: string;
    };
  };
};

function PostmortemCard({ postmortem }: PostmortemCardProps) {
  const { userTimeZone } = useTimezone();

  return (
    <Card className="transition-all duration-300 border border-slate-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/postmortems/${postmortem.incidentId}`}
              className="block text-lg font-bold text-foreground no-underline mb-2 leading-snug hover:text-primary transition-colors"
            >
              {postmortem.title}
            </Link>
            <Link
              href={`/incidents/${postmortem.incidentId}`}
              className="text-sm text-muted-foreground no-underline inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {postmortem.incident.title}
            </Link>
          </div>
          <Badge
            variant={
              postmortem.status === 'PUBLISHED'
                ? 'success'
                : postmortem.status === 'ARCHIVED'
                  ? 'neutral'
                  : 'warning'
            }
            className="shrink-0"
          >
            {postmortem.status}
          </Badge>
        </div>

        {/* Summary */}
        {postmortem.summary && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">
            {postmortem.summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-4 border-t border-slate-100">
          <span className="flex items-center gap-2">
            <UserAvatar
              userId={postmortem.createdBy.id}
              name={postmortem.createdBy.name}
              gender={postmortem.createdBy.gender}
              size="xs"
            />
            {postmortem.createdBy.name}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(postmortem.createdAt, userTimeZone, { format: 'date' })}
          </span>
          {postmortem.publishedAt && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Published {formatDateTime(postmortem.publishedAt, userTimeZone, { format: 'date' })}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// Memoize PostmortemCard to prevent unnecessary re-renders in postmortem lists
export default memo(PostmortemCard, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.postmortem.id === nextProps.postmortem.id &&
    prevProps.postmortem.title === nextProps.postmortem.title &&
    prevProps.postmortem.summary === nextProps.postmortem.summary &&
    prevProps.postmortem.status === nextProps.postmortem.status &&
    prevProps.postmortem.createdAt.getTime() === nextProps.postmortem.createdAt.getTime() &&
    prevProps.postmortem.publishedAt?.getTime() === nextProps.postmortem.publishedAt?.getTime() &&
    prevProps.postmortem.createdBy.name === nextProps.postmortem.createdBy.name &&
    prevProps.postmortem.incident.title === nextProps.postmortem.incident.title
  );
});
