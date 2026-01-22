import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import {
  LayoutDashboard,
  Plus,
  Sparkles,
  Terminal,
  Shield,
  Users,
  Minus,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DASHBOARD_TEMPLATES } from '@/lib/reports/dashboard-templates';
import { formatDateTime, getUserTimeZone } from '@/lib/timezone';
import DashboardCard from '@/components/reports/DashboardCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports & Dashboards | OpsKnight',
  description: 'Customizable executive reports and operational dashboards',
};

const TEMPLATE_ICONS: Record<string, any> = {
  'executive-summary': LayoutDashboard,
  'sre-operations': Terminal,
  'sla-performance': Shield,
  'team-performance': Users,
  minimal: Minus,
};

export default async function ReportsPage() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/reports');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, timeZone: true },
  });

  if (!user) {
    redirect('/login?callbackUrl=/reports');
  }

  const userTimeZone = getUserTimeZone(user);

  // Fetch user's dashboards
  const dashboards = await prisma.dashboard.findMany({
    where: { userId: user.id, isTemplate: false },
    include: { _count: { select: { widgets: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="w-full px-4 py-6 space-y-8 [zoom:0.8]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-white">
              <LayoutDashboard className="h-6 w-6 md:h-8 md:w-8" />
              Reports &amp; Dashboards
            </h1>
            <p className="text-xs md:text-sm opacity-90 mt-1 text-white">
              Build customizable dashboards with drag-and-drop widgets
            </p>
          </div>
          <Link href="/reports/executive/new">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2 shadow-md">
              <Plus className="h-5 w-5" />
              Create Dashboard
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{dashboards.length}</div>
            <div className="text-xs opacity-80">Your Dashboards</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{DASHBOARD_TEMPLATES.length}</div>
            <div className="text-xs opacity-80">Templates</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">30+</div>
            <div className="text-xs opacity-80">Widget Types</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">∞</div>
            <div className="text-xs opacity-80">Customizations</div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Dashboard Templates</h2>
          </div>
          <span className="text-sm text-muted-foreground">Click to preview or clone</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {DASHBOARD_TEMPLATES.map(template => {
            const Icon = TEMPLATE_ICONS[template.id] || LayoutDashboard;
            return (
              <Link key={template.id} href={`/reports/executive?template=${template.id}`}>
                <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: template.color }} />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{template.widgets.length} widgets</span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* My Dashboards Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Dashboards</h2>
          {dashboards.length > 0 && (
            <Link href="/reports/executive/new">
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </Link>
          )}
        </div>

        {dashboards.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium mb-1">No dashboards yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first custom dashboard or start from a template
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/reports/executive/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create from scratch
                  </Button>
                </Link>
                <Link href={`/reports/executive?template=executive-summary`}>
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Use template
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboards.map(dashboard => (
              <DashboardCard
                key={dashboard.id}
                id={dashboard.id}
                name={dashboard.name}
                description={dashboard.description}
                widgetCount={dashboard._count.widgets}
                isDefault={dashboard.isDefault}
                updatedAt={formatDateTime(dashboard.updatedAt, userTimeZone, {
                  format: 'relative',
                })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
