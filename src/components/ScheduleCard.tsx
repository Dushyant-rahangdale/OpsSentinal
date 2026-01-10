import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Clock, Layers, Users, ArrowRight } from 'lucide-react';

type ScheduleCardProps = {
  schedule: {
    id: string;
    name: string;
    timeZone: string;
    layers: Array<{
      users: Array<{
        userId: string;
      }>;
    }>;
  };
};

export default function ScheduleCard({ schedule }: ScheduleCardProps) {
  const uniqueUsers = new Set<string>();
  schedule.layers.forEach(layer => {
    layer.users.forEach(user => uniqueUsers.add(user.userId));
  });

  return (
    <Link href={`/schedules/${schedule.id}`} className="block group">
      <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] border-slate-200 hover:border-primary/30 hover:bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
              {schedule.name}
            </CardTitle>
            <Badge variant="outline" size="xs" className="gap-1.5 shrink-0 bg-white/50">
              <Clock className="h-3 w-3 text-slate-500" />
              {schedule.timeZone}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>
                  {schedule.layers.length} {schedule.layers.length === 1 ? 'layer' : 'layers'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                <span>
                  {uniqueUsers.size} {uniqueUsers.size === 1 ? 'responder' : 'responders'}
                </span>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
