import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  ChevronLeft,
  LayoutDashboard,
  Sparkles,
  Terminal,
  Shield,
  Users,
  Minus,
} from 'lucide-react';
import { DASHBOARD_TEMPLATES } from '@/lib/reports/dashboard-templates';
import CreateBlankDashboardButton from './CreateBlankDashboardButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create Dashboard | OpsKnight',
  description: 'Create a new custom dashboard',
};

const TEMPLATE_ICONS: Record<string, any> = {
  'executive-summary': LayoutDashboard,
  'sre-operations': Terminal,
  'sla-performance': Shield,
  'team-performance': Users,
  minimal: Minus,
};

export default async function NewDashboardPage() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/reports/executive/new');
  }

  return (
    <div className="w-full px-4 py-6 space-y-6 [zoom:0.8]">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <Link
            href="/reports"
            className="mt-1 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Create New Dashboard
            </h1>
            <p className="text-xs md:text-sm opacity-90 mt-1 text-white">
              Start from a template or build from scratch
            </p>
          </div>
        </div>
      </div>

      {/* Start from blank */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Start from Scratch</h2>
        <Card className="hover:shadow-lg transition-shadow border-dashed max-w-md">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-2">
              <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Blank Dashboard</CardTitle>
            <CardDescription>Create an empty dashboard and add widgets manually</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBlankDashboardButton />
          </CardContent>
        </Card>
      </section>

      {/* Start from template */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Start from Template</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DASHBOARD_TEMPLATES.map(template => {
            const Icon = TEMPLATE_ICONS[template.id] || LayoutDashboard;
            return (
              <Link key={template.id} href={`/reports/executive?template=${template.id}`}>
                <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
                  <CardHeader>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: template.color }} />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      {template.widgets.length} widgets • Click to preview &amp; clone
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
