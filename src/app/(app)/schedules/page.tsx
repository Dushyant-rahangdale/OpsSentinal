import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createSchedule } from './actions';
import ScheduleCard from '@/components/ScheduleCard';
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
import { cn } from '@/lib/utils';

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
      {/* Header with Glassmorphic Stats */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6 md:h-8 md:w-8" />
              Schedules
            </h1>
            <p className="text-primary-foreground/80 text-xs md:text-sm max-w-2xl">
              Design rotations, monitor coverage, and keep responders aligned
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 w-full lg:w-auto">
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold">{schedules.length}</div>
                <div className="text-[10px] md:text-xs opacity-90">Schedules</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold">{totalLayers}</div>
                <div className="text-[10px] md:text-xs opacity-90">Total Layers</div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'bg-white/10 border-white/20 backdrop-blur',
                hasActiveCoverage ? 'text-green-100' : 'text-red-100'
              )}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold">
                  {hasActiveCoverage ? 'Active' : 'Inactive'}
                </div>
                <div className="text-[10px] md:text-xs opacity-90">Status</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
