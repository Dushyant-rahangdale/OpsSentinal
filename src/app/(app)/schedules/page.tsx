import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createSchedule } from './actions';
import ScheduleCard from '@/components/ScheduleCard';
import ScheduleStats from '@/components/ScheduleStats';
import ScheduleCreateForm from '@/components/ScheduleCreateForm';
import { Calendar, AlertCircle, Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';

export default async function SchedulesPage() {
  const schedules = await prisma.onCallSchedule.findMany({
    include: {
      layers: {
        include: {
          users: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalLayers = schedules.reduce((sum, schedule) => sum + schedule.layers.length, 0);
  const hasActiveCoverage = schedules.some(schedule =>
    schedule.layers.some(layer => layer.users.length > 0)
  );

  const permissions = await getUserPermissions();
  const canManageSchedules = permissions.isAdminOrResponder;

  return (
    <main className="w-full p-4 md:p-6 space-y-6 [zoom:0.8]">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                On-call Management
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Schedules</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Design rotations, monitor coverage, and keep responders aligned
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={hasActiveCoverage ? 'default' : 'destructive'}
              className="gap-2 py-2 px-4"
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  hasActiveCoverage ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {hasActiveCoverage ? 'Rotations active' : 'No active rotations'}
            </Badge>

            {canManageSchedules ? (
              <Button asChild>
                <a href="#new-schedule" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Schedule
                </a>
              </Button>
            ) : (
              <Button disabled title="Admin or Responder role required to create schedules">
                <Plus className="h-4 w-4" />
                New Schedule
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Statistics */}
      <ScheduleStats
        scheduleCount={schedules.length}
        layerCount={totalLayers}
        hasActiveCoverage={hasActiveCoverage}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        {/* Schedules List */}
        <div className="xl:col-span-3 space-y-4">
          {schedules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle className="text-xl mb-2">No schedules yet</CardTitle>
                <CardDescription className="mb-6 max-w-md">
                  Create a schedule to start building your on-call coverage
                </CardDescription>
                {canManageSchedules && (
                  <Button asChild>
                    <a href="#new-schedule" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Schedule
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules.map(schedule => (
                <ScheduleCard key={schedule.id} schedule={schedule} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <ScheduleCreateForm action={createSchedule} canCreate={canManageSchedules} />

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                <AlertCircle className="h-4 w-4" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 leading-relaxed">
                Set a rotation and assign your responders to start tracking coverage
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
