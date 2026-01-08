import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { buildScheduleBlocks } from '@/lib/oncall';
import { formatDateTime, formatDateForInput } from '@/lib/timezone';
import {
  addLayerUser,
  createLayer,
  createOverride,
  deleteLayer,
  deleteOverride,
  moveLayerUser,
  removeLayerUser,
  updateLayer,
  updateSchedule,
} from '../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import LayerCard from '@/components/LayerCard';
import LayerCreateForm from '@/components/LayerCreateForm';
import OverrideForm from '@/components/OverrideForm';
import OverrideList from '@/components/OverrideList';
import CurrentCoverageDisplay from '@/components/CurrentCoverageDisplay';
import ScheduleTimeline from '@/components/ScheduleTimeline';
import LayerHelpPanel from '@/components/LayerHelpPanel';
import ScheduleEditForm from '@/components/ScheduleEditForm';

// Revalidate every 30 seconds to ensure current coverage is up-to-date
export const revalidate = 30;

export default async function ScheduleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ history?: string }>;
}) {
  const { id } = await params;
  const awaitedSearchParams = await searchParams;
  // Use current time - this will be recalculated on each page load/refresh
  const now = new Date();
  const calendarRangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const calendarRangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  // Coverage range: from yesterday to 90 days ahead to ensure we catch current coverage
  const coverageRangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const coverageRangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);
  const historyPageSize = 8;
  const historyPage = Math.max(1, Number(awaitedSearchParams?.history ?? 1) || 1);

  const [schedule, users, overridesInRange, upcomingOverrides, historyCount, historyOverrides] =
    await Promise.all([
      prisma.onCallSchedule.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          timeZone: true,
          layers: {
            select: {
              id: true,
              name: true,
              start: true,
              end: true,
              rotationLengthHours: true,
              users: {
                select: {
                  userId: true,
                  position: true,
                  user: {
                    select: { name: true, avatarUrl: true, gender: true },
                  },
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.onCallOverride.findMany({
        where: {
          scheduleId: id,
          start: { lt: calendarRangeEnd },
          end: { gt: calendarRangeStart },
        },
        select: {
          id: true,
          start: true,
          end: true,
          userId: true,
          replacesUserId: true,
          user: { select: { name: true, avatarUrl: true, gender: true } },
          replacesUser: { select: { name: true } },
        },
      }),
      prisma.onCallOverride.findMany({
        where: { scheduleId: id, end: { gte: now } },
        select: {
          id: true,
          start: true,
          end: true,
          userId: true,
          replacesUserId: true,
          user: { select: { name: true, avatarUrl: true, gender: true } },
          replacesUser: { select: { name: true } },
        },
        orderBy: { start: 'asc' },
        take: 6,
      }),
      prisma.onCallOverride.count({
        where: { scheduleId: id, end: { lt: now } },
      }),
      prisma.onCallOverride.findMany({
        where: { scheduleId: id, end: { lt: now } },
        select: {
          id: true,
          start: true,
          end: true,
          userId: true,
          replacesUserId: true,
          user: { select: { name: true, avatarUrl: true, gender: true } },
          replacesUser: { select: { name: true } },
        },
        orderBy: { end: 'desc' },
        skip: (historyPage - 1) * historyPageSize,
        take: historyPageSize,
      }),
    ]);

  if (!schedule) notFound();

  const permissions = await getUserPermissions();
  const canManageSchedules = permissions.isAdminOrResponder;

  const scheduleBlocks = buildScheduleBlocks(
    schedule.layers,
    overridesInRange,
    calendarRangeStart,
    calendarRangeEnd
  );
  const calendarShifts = scheduleBlocks.map(block => ({
    id: block.id,
    start: block.start.toISOString(),
    end: block.end.toISOString(),
    label: `${block.layerName}: ${block.userName}${block.source === 'override' ? ' (Override)' : ''}`,
    user: {
      name: block.userName,
      avatarUrl: block.userAvatar,
      gender: block.userGender,
    },
  }));

  const coverageBlocks = buildScheduleBlocks(
    schedule.layers,
    overridesInRange,
    coverageRangeStart,
    coverageRangeEnd
  );
  // Filter for blocks that are currently active (start <= now < end)
  // Use getTime() for accurate comparison
  const nowTime = now.getTime();
  const activeBlocks = coverageBlocks.filter(block => {
    const blockStartTime = block.start.getTime();
    const blockEndTime = block.end.getTime();
    return blockStartTime <= nowTime && blockEndTime > nowTime;
  });
  const _nextChange = activeBlocks.length
    ? activeBlocks.reduce(
        (earliest, block) => (block.end < earliest ? block.end : earliest),
        activeBlocks[0].end
      )
    : coverageBlocks
        .filter(block => block.start > now)
        .reduce<Date | null>((earliest, block) => {
          if (!earliest || block.start < earliest) return block.start;
          return earliest;
        }, null);
  const historyTotalPages = Math.max(1, Math.ceil(historyCount / historyPageSize));

  const _formatDateTimeLocal = (date: Date) =>
    formatDateTime(date, schedule.timeZone, { format: 'short' });

  const scheduleTimezoneLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timeZone,
    timeZoneName: 'short',
  }).format(new Date());

  const formatShortTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone: schedule.timeZone,
    }).format(date);

  return (
    <main style={{ padding: '1rem' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid var(--border)',
        }}
      >
        <div style={{ flex: 1 }}>
          <Link
            href="/schedules"
            className="schedule-back-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
          >
            ← Back to schedules
          </Link>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            {schedule.name}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                color: '#0c4a6e',
                border: '1px solid #bae6fd',
              }}
            >
              {schedule.timeZone}
            </span>
            <span>·</span>
            <span>
              Current time: <strong>{formatShortTime(now)}</strong> ({scheduleTimezoneLabel})
            </span>
            <span>·</span>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              All times shown in schedule timezone
            </span>
          </p>
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#92400e',
            }}
          >
            Times entered are interpreted in the schedule timezone. If you change the timezone,
            re-save layers and overrides.
          </div>
          {canManageSchedules && (
            <ScheduleEditForm
              scheduleId={schedule.id}
              currentName={schedule.name}
              currentTimeZone={schedule.timeZone}
              updateSchedule={updateSchedule}
              canManageSchedules={canManageSchedules}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background:
                activeBlocks.length > 0
                  ? 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: `1px solid ${activeBlocks.length > 0 ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.85rem',
              fontWeight: '600',
              color: activeBlocks.length > 0 ? '#065f46' : '#991b1b',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: activeBlocks.length > 0 ? '#10b981' : '#ef4444',
                display: 'inline-block',
              }}
            />
            {activeBlocks.length > 0 ? 'On-call active' : 'No coverage'}
          </div>
        </div>
      </header>

      {/* Current Coverage - Prominent Display */}
      <div style={{ marginBottom: '2rem' }}>
        <CurrentCoverageDisplay
          key={`coverage-${schedule.id}-${schedule.layers.map(l => `${l.id}-${l.start.getTime()}-${l.end?.getTime() || 'null'}`).join('-')}`}
          initialBlocks={activeBlocks.map(block => ({
            id: block.id,
            userName: block.userName,
            userAvatar: block.userAvatar,
            userGender: block.userGender,
            layerName: block.layerName,
            start: block.start.toISOString(),
            end: block.end.toISOString(),
          }))}
          scheduleTimeZone={schedule.timeZone}
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <LayerHelpPanel />

          <section
            className="glass-panel"
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Layers
                </h3>
                <span
                  title="Layers define rotation patterns. Multiple layers can run simultaneously to provide different coverage (e.g., day shift and night shift). Each layer rotates through its assigned responders based on the rotation length."
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0c4a6e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'help',
                    border: '1px solid #bae6fd',
                  }}
                >
                  ?
                </span>
              </div>
              <span
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                  color: '#0c4a6e',
                  border: '1px solid #bae6fd',
                }}
              >
                {schedule.layers.length} {schedule.layers.length === 1 ? 'layer' : 'layers'}
              </span>
            </div>
            {schedule.layers.length === 0 ? (
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '8px',
                }}
              >
                No layers yet. Add a layer to define rotations.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                {schedule.layers.map(layer => (
                  <LayerCard
                    key={layer.id}
                    layer={{
                      id: layer.id,
                      name: layer.name,
                      start: new Date(layer.start),
                      end: layer.end ? new Date(layer.end) : null,
                      rotationLengthHours: layer.rotationLengthHours,
                      users: layer.users,
                    }}
                    scheduleId={schedule.id}
                    timeZone={schedule.timeZone}
                    users={users}
                    canManageSchedules={canManageSchedules}
                    updateLayer={updateLayer}
                    deleteLayer={deleteLayer}
                    addLayerUser={addLayerUser}
                    moveLayerUser={moveLayerUser}
                    removeLayerUser={removeLayerUser}
                  />
                ))}
              </div>
            )}
            <LayerCreateForm
              scheduleId={schedule.id}
              canManageSchedules={canManageSchedules}
              createLayer={createLayer}
              defaultStartDate={formatDateForInput(now, schedule.timeZone)}
            />
          </section>

          {/* Timeline View */}
          <ScheduleTimeline
            shifts={scheduleBlocks.map(block => ({
              id: block.id,
              start: block.start.toISOString(),
              end: block.end.toISOString(),
              label: `${block.layerName}: ${block.userName}${block.source === 'override' ? ' (Override)' : ''}`,
              layerName: block.layerName,
              userName: block.userName,
              userAvatar: block.userAvatar,
              userGender: block.userGender,
              source: block.source,
            }))}
            timeZone={schedule.timeZone}
            layers={schedule.layers.map(l => ({ id: l.id, name: l.name }))}
          />

          {/* Calendar View */}
          <ScheduleCalendar shifts={calendarShifts} timeZone={schedule.timeZone} />
        </div>

        <aside>
          <OverrideForm
            scheduleId={schedule.id}
            users={users}
            canManageSchedules={canManageSchedules}
            createOverride={createOverride}
          />
          <OverrideList
            overrides={upcomingOverrides.map(o => ({
              id: o.id,
              start: new Date(o.start),
              end: new Date(o.end),
              userId: o.userId,
              replacesUserId: o.replacesUserId,
              user: o.user,
              replacesUser: o.replacesUser,
            }))}
            scheduleId={schedule.id}
            canManageSchedules={canManageSchedules}
            deleteOverride={deleteOverride}
            timeZone={schedule.timeZone}
            title="Upcoming Overrides"
            emptyMessage="No upcoming overrides."
          />
          <OverrideList
            overrides={historyOverrides.map(o => ({
              id: o.id,
              start: new Date(o.start),
              end: new Date(o.end),
              userId: o.userId,
              replacesUserId: o.replacesUserId,
              user: o.user,
              replacesUser: o.replacesUser,
            }))}
            scheduleId={schedule.id}
            canManageSchedules={canManageSchedules}
            deleteOverride={deleteOverride}
            timeZone={schedule.timeZone}
            title="Override History"
            emptyMessage="No past overrides yet."
          />
          {historyTotalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <Link
                href={`/schedules/${schedule.id}?history=${Math.max(1, historyPage - 1)}`}
                className={`glass-button ${historyPage === 1 ? 'disabled' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                Prev
              </Link>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {historyPage} of {historyTotalPages}
              </span>
              <Link
                href={`/schedules/${schedule.id}?history=${Math.min(historyTotalPages, historyPage + 1)}`}
                className={`glass-button ${historyPage === historyTotalPages ? 'disabled' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                Next
              </Link>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
