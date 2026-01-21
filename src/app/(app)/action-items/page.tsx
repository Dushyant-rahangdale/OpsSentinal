import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import ActionItemsBoard from '@/components/action-items/ActionItemsBoard';
import ActionItemsStats from '@/components/action-items/ActionItemsStats';

export const dynamic = 'force-dynamic';

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    owner?: string;
    priority?: string;
    view?: 'board' | 'list';
  }>;
}) {
  const session = await getServerSession(await getAuthOptions());
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const status = params.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | undefined;
  const owner = params.owner;
  const priority = params.priority as 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
  const view = params.view || 'board';

  // Get all postmortems with action items
  const postmortems = await prisma.postmortem.findMany({
    where: {
      actionItems: {
        not: Prisma.JsonNull,
      },
    },
    include: {
      incident: {
        select: {
          id: true,
          title: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Extract and flatten all action items with postmortem context
  const allActionItems: Array<{
    id: string;
    title: string;
    description: string;
    owner?: string;
    dueDate?: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    postmortemId: string;
    postmortemTitle: string;
    incidentId: string;
    incidentTitle: string;
    serviceName: string;
    createdAt: Date;
  }> = [];

  postmortems.forEach(postmortem => {
    const actionItems = postmortem.actionItems as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Array.isArray(actionItems)) {
      actionItems.forEach((item: any) => {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        allActionItems.push({
          id: item.id || `action-${postmortem.id}-${Math.random()}`,
          title: item.title || '',
          description: item.description || '',
          owner: item.owner,
          dueDate: item.dueDate,
          status: item.status || 'OPEN',
          priority: item.priority || 'MEDIUM',
          postmortemId: postmortem.id,
          postmortemTitle: postmortem.title,
          incidentId: postmortem.incidentId,
          incidentTitle: postmortem.incident.title,
          serviceName: postmortem.incident.service.name,
          createdAt: postmortem.createdAt,
        });
      });
    }
  });

  // Apply filters
  let filteredItems = allActionItems;
  if (status) {
    filteredItems = filteredItems.filter(item => item.status === status);
  }
  if (owner) {
    filteredItems = filteredItems.filter(item => item.owner === owner);
  }
  if (priority) {
    filteredItems = filteredItems.filter(item => item.priority === priority);
  }

  // Get all users for owner filter
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  const permissions = await getUserPermissions();
  const canManage = permissions.isResponderOrAbove;

  // Calculate statistics
  const stats = {
    total: allActionItems.length,
    open: allActionItems.filter(item => item.status === 'OPEN').length,
    inProgress: allActionItems.filter(item => item.status === 'IN_PROGRESS').length,
    completed: allActionItems.filter(item => item.status === 'COMPLETED').length,
    blocked: allActionItems.filter(item => item.status === 'BLOCKED').length,
    overdue: allActionItems.filter(item => {
      if (!item.dueDate || item.status === 'COMPLETED') return false;
      return new Date(item.dueDate) < new Date();
    }).length,
    highPriority: allActionItems.filter(
      item => item.priority === 'HIGH' && item.status !== 'COMPLETED'
    ).length,
  };

  return (
    <div className="p-6">
      <div className="mb-8 pb-6 border-b-2 border-slate-200">
        <h1 className="text-[2.5rem] font-extrabold mb-2 bg-gradient-to-br from-slate-800 to-slate-500 bg-clip-text text-transparent tracking-tight">
          Action Items
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Track and manage action items from postmortems
        </p>
      </div>

      {/* Statistics */}
      <ActionItemsStats stats={stats} />

      {/* Board/List View */}
      <ActionItemsBoard
        actionItems={filteredItems}
        users={users}
        canManage={canManage}
        view={view}
        filters={{
          status,
          owner,
          priority,
        }}
      />
    </div>
  );
}
