import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Calendar, Layers, Shield } from 'lucide-react';

type ScheduleStatsProps = {
  scheduleCount: number;
  layerCount: number;
  hasActiveCoverage: boolean;
};

export default function ScheduleStats({
  scheduleCount,
  layerCount,
  hasActiveCoverage,
}: ScheduleStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Schedules</p>
              <p className="text-3xl font-bold">{scheduleCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Layers</p>
              <p className="text-3xl font-bold">{layerCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Coverage Status</p>
              <p
                className={`text-3xl font-bold ${
                  hasActiveCoverage ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {hasActiveCoverage ? 'Healthy' : 'Needs setup'}
              </p>
            </div>
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center ${
                hasActiveCoverage ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <Shield
                className={`h-6 w-6 ${hasActiveCoverage ? 'text-green-600' : 'text-red-600'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
