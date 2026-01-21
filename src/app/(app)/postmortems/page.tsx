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
import PostmortemCard from '@/components/PostmortemCard';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import { cn } from '@/lib/utils';

export default async function PostmortemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const status = params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined;

  const postmortems = await getAllPostmortems(status);
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
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 [zoom:0.8]">
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
        {postmortems.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No Postmortems Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {status
                  ? `There are no ${status.toLowerCase()} postmortems at the moment.`
                  : 'Get started by creating a postmortem for a resolved incident.'}
              </p>

              {resolvedIncidentsWithoutPostmortems.length > 0 && (
                <div className="w-full max-w-sm bg-slate-50 rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-left">
                    Ready for Postmortem
                  </p>
                  <div className="space-y-2">
                    {resolvedIncidentsWithoutPostmortems.slice(0, 3).map(incident => (
                      <Link
                        key={incident.id}
                        href={`/postmortems/${incident.id}`}
                        className="flex items-center justify-between p-2 hover:bg-white hover:shadow-sm rounded-md transition-all group border border-transparent hover:border-slate-200"
                      >
                        <span className="text-sm font-medium truncate flex-1 text-left">
                          {incident.title}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          →
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-6">
            {postmortems.map(postmortem => (
              <PostmortemCard key={postmortem.id} postmortem={postmortem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
