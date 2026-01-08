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
      <Card className="transition-all duration-200 hover:shadow-lg hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
              {schedule.name}
            </CardTitle>
            <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
              <Clock className="h-3 w-3" />
              {schedule.timeZone}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Layered rotations with overrides and handoffs
          </p>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>
                  {schedule.layers.length} {schedule.layers.length === 1 ? 'layer' : 'layers'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>
                  {uniqueUsers.size} {uniqueUsers.size === 1 ? 'responder' : 'responders'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
              View schedule
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
