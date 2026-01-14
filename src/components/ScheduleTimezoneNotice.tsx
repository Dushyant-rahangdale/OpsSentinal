'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert';
import { Badge } from '@/components/ui/shadcn/badge';
import { useTimezone } from '@/contexts/TimezoneContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';

type ScheduleTimezoneNoticeProps = {
  scheduleTimeZone: string;
  className?: string;
};

export default function ScheduleTimezoneNotice({
  scheduleTimeZone,
  className,
}: ScheduleTimezoneNoticeProps) {
  const { userTimeZone, browserTimeZone } = useTimezone();
  const hasMismatch = scheduleTimeZone !== userTimeZone;
  const showBrowser = browserTimeZone && browserTimeZone !== userTimeZone;
  const Icon = hasMismatch ? AlertTriangle : Info;

  return (
    <Alert
      className={cn(
        'border-slate-200/80 bg-slate-50/70',
        hasMismatch && 'border-amber-200/80 bg-amber-50/70',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', hasMismatch ? 'text-amber-600' : 'text-slate-600')} />
      <AlertTitle className="text-sm">
        {hasMismatch ? 'Timezone warning' : 'Timezone context'}
      </AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>Schedule:</span>
          <Badge variant="info" size="xs" className="font-semibold">
            {scheduleTimeZone}
          </Badge>
          <span>Your profile:</span>
          <Badge variant={hasMismatch ? 'warning' : 'success'} size="xs" className="font-semibold">
            {userTimeZone}
          </Badge>
          {showBrowser && (
            <>
              <span>Browser:</span>
              <Badge variant="outline" size="xs" className="font-semibold">
                {browserTimeZone}
              </Badge>
            </>
          )}
        </div>
        <p className={cn('mt-2 text-xs', hasMismatch ? 'text-amber-700' : 'text-slate-600')}>
          Shift calculations, overrides, and calendars use the schedule timezone.
        </p>
      </AlertDescription>
    </Alert>
  );
}
