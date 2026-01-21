import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllPostmortems } from './actions';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Card } from '@/components/ui/shadcn/card';
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

  return (
    <div className="p-6 [zoom:0.8]">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
        <div>
          <h1 className="text-[2.5rem] font-extrabold mb-2 bg-gradient-to-br from-slate-800 to-slate-500 bg-clip-text text-transparent tracking-tight">
            Postmortems
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Learn from incidents and improve your incident response process
          </p>
        </div>
        {resolvedIncidentsWithoutPostmortems.length > 0 && (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Link href="/postmortems/create">
              <Button>Create Postmortem</Button>
            </Link>
            <p className="text-xs text-muted-foreground m-0 text-center">
              {resolvedIncidentsWithoutPostmortems.length} resolved incident
              {resolvedIncidentsWithoutPostmortems.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-200 w-fit">
        <Link
          href="/postmortems"
          className={cn(
            'px-5 py-2 rounded-md text-sm no-underline transition-all duration-200',
            !status
              ? 'bg-primary text-primary-foreground font-semibold shadow-md'
              : 'text-foreground font-medium hover:bg-slate-100'
          )}
        >
          All
        </Link>
        <Link
          href="/postmortems?status=PUBLISHED"
          className={cn(
            'px-5 py-2 rounded-md text-sm no-underline transition-all duration-200',
            status === 'PUBLISHED'
              ? 'bg-primary text-primary-foreground font-semibold shadow-md'
              : 'text-foreground font-medium hover:bg-slate-100'
          )}
        >
          Published
        </Link>
        <Link
          href="/postmortems?status=DRAFT"
          className={cn(
            'px-5 py-2 rounded-md text-sm no-underline transition-all duration-200',
            status === 'DRAFT'
              ? 'bg-primary text-primary-foreground font-semibold shadow-md'
              : 'text-foreground font-medium hover:bg-slate-100'
          )}
        >
          Drafts
        </Link>
      </div>

      {/* Postmortems List */}
      {postmortems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-base mb-4">
            {status
              ? `No ${status.toLowerCase()} postmortems found.`
              : 'No postmortems found. Create one from a resolved incident.'}
          </p>
          {resolvedIncidentsWithoutPostmortems.length > 0 && (
            <div className="flex flex-col gap-3 items-center">
              <p className="text-sm text-muted-foreground mb-2">
                Resolved incidents available for postmortem:
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[400px]">
                {resolvedIncidentsWithoutPostmortems.slice(0, 5).map(incident => (
                  <Link
                    key={incident.id}
                    href={`/postmortems/${incident.id}`}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md no-underline block hover:bg-slate-100 transition-colors"
                  >
                    <div className="font-semibold text-foreground mb-1">{incident.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Resolved{' '}
                      {incident.resolvedAt
                        ? formatDateTime(incident.resolvedAt, userTimeZone, { format: 'date' })
                        : 'N/A'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-5">
          {postmortems.map(postmortem => (
            <PostmortemCard key={postmortem.id} postmortem={postmortem} />
          ))}
        </div>
      )}
    </div>
  );
}
