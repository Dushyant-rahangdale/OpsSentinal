import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllPostmortems } from './actions';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';
import PostmortemsListTable from '@/components/postmortem/PostmortemsListTable';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { cn } from '@/lib/utils';

export default async function PostmortemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const status = params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined;
  const page = params.page ? parseInt(params.page) : 1;

  const { postmortems, pagination } = await getAllPostmortems({ status, page });
  const permissions = await getUserPermissions();
  const canCreate = permissions.isResponderOrAbove;

  // Get user timezone for date formatting
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { timeZone: true },
      })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  // Get resolved incidents without postmortems for quick create
  const resolvedIncidentsWithoutPostmortems = canCreate
    ? await prisma.incident.findMany({
        where: {
          status: 'RESOLVED',
          postmortem: null,
        },
        select: {
          id: true,
          title: true,
          resolvedAt: true,
        },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
      })
    : [];

  // Fetch counts for metrics
  const [totalCount, publishedCount, draftCount, archivedCount] = await Promise.all([
    prisma.postmortem.count(),
    prisma.postmortem.count({ where: { status: 'PUBLISHED' } }),
    prisma.postmortem.count({ where: { status: 'DRAFT' } }),
    prisma.postmortem.count({ where: { status: 'ARCHIVED' } }),
  ]);

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Metric Panel Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-white">
              <FileText className="h-6 w-6 md:h-8 md:w-8" />
              Postmortems
            </h1>
            <p className="text-xs md:text-sm opacity-90 mt-1 text-white">
              Learn from incidents and improve your incident response process
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 w-full lg:w-auto">
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold">{totalCount}</div>
                <div className="text-[10px] md:text-xs opacity-90">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold text-green-200">
                  {publishedCount}
                </div>
                <div className="text-[10px] md:text-xs opacity-90">Published</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold text-yellow-200">
                  {draftCount}
                </div>
                <div className="text-[10px] md:text-xs opacity-90">Drafts</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20 backdrop-blur">
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-xl md:text-2xl font-extrabold text-gray-200">
                  {archivedCount}
                </div>
                <div className="text-[10px] md:text-xs opacity-90">Archived</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <Link
              href="/postmortems"
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                !status
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 hover:text-foreground'
              )}
            >
              All
            </Link>
            <Link
              href="/postmortems?status=PUBLISHED"
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                status === 'PUBLISHED'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 hover:text-foreground'
              )}
            >
              Published
            </Link>
            <Link
              href="/postmortems?status=DRAFT"
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                status === 'DRAFT'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-200/50 hover:text-foreground'
              )}
            >
              Drafts
            </Link>
          </div>

          {resolvedIncidentsWithoutPostmortems.length > 0 && (
            <Link href="/postmortems/create">
              <Button className="shadow-sm">
                Create Postmortem
                <span className="ml-2 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
                  {resolvedIncidentsWithoutPostmortems.length}
                </span>
              </Button>
            </Link>
          )}
        </div>

        {/* Postmortems List */}
        {/* Postmortems List */}
        <PostmortemsListTable
          postmortems={postmortems}
          pagination={pagination}
          userTimeZone={userTimeZone}
          canManage={canCreate}
        />
      </div>
    </div>
  );
}
