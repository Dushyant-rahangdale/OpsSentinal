import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { buildScheduleBlocks } from '@/lib/oncall';
import {
    addLayerUser,
    createLayer,
    createOverride,
    deleteLayer,
    deleteOverride,
    moveLayerUser,
    removeLayerUser,
    updateLayer
} from '../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ScheduleCalendar from '@/components/ScheduleCalendar';

export default async function ScheduleDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ history?: string }>;
}) {
    const { id } = await params;
    const awaitedSearchParams = await searchParams;
    const now = new Date();
    const calendarRangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const calendarRangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const coverageRangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const coverageRangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);
    const historyPageSize = 8;
    const historyPage = Math.max(1, Number(awaitedSearchParams?.history ?? 1) || 1);

    const [
        schedule,
        users,
        overridesInRange,
        upcomingOverrides,
        historyCount,
        historyOverrides
    ] = await Promise.all([
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
                                    select: { name: true }
                                }
                            },
                            orderBy: { position: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        }),
        prisma.user.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.onCallOverride.findMany({
            where: {
                scheduleId: id,
                start: { lt: calendarRangeEnd },
                end: { gt: calendarRangeStart }
            },
            select: {
                id: true,
                start: true,
                end: true,
                userId: true,
                replacesUserId: true,
                user: { select: { name: true } },
                replacesUser: { select: { name: true } }
            }
        }),
        prisma.onCallOverride.findMany({
            where: { scheduleId: id, end: { gte: now } },
            select: {
                id: true,
                start: true,
                end: true,
                userId: true,
                replacesUserId: true,
                user: { select: { name: true } },
                replacesUser: { select: { name: true } }
            },
            orderBy: { start: 'asc' },
            take: 6
        }),
        prisma.onCallOverride.count({
            where: { scheduleId: id, end: { lt: now } }
        }),
        prisma.onCallOverride.findMany({
            where: { scheduleId: id, end: { lt: now } },
            select: {
                id: true,
                start: true,
                end: true,
                userId: true,
                replacesUserId: true,
                user: { select: { name: true } },
                replacesUser: { select: { name: true } }
            },
            orderBy: { end: 'desc' },
            skip: (historyPage - 1) * historyPageSize,
            take: historyPageSize
        })
    ]);

    if (!schedule) notFound();

    const permissions = await getUserPermissions();
    const canManageSchedules = permissions.isAdminOrResponder;

    const scheduleBlocks = buildScheduleBlocks(schedule.layers, overridesInRange, calendarRangeStart, calendarRangeEnd);
    const calendarShifts = scheduleBlocks.map((block) => ({
        id: block.id,
        start: block.start.toISOString(),
        end: block.end.toISOString(),
        label: `${block.layerName}: ${block.userName}${block.source === 'override' ? ' (Override)' : ''}`
    }));

    const coverageBlocks = buildScheduleBlocks(schedule.layers, overridesInRange, coverageRangeStart, coverageRangeEnd);
    const activeBlocks = coverageBlocks.filter((block) => block.start <= now && block.end > now);
    const nextChange = activeBlocks.length
        ? activeBlocks.reduce((earliest, block) => (block.end < earliest ? block.end : earliest), activeBlocks[0].end)
        : coverageBlocks
            .filter((block) => block.start > now)
            .reduce<Date | null>((earliest, block) => {
                if (!earliest || block.start < earliest) return block.start;
                return earliest;
            }, null);
    const historyTotalPages = Math.max(1, Math.ceil(historyCount / historyPageSize));

    const formatDateTime = (date: Date) =>
        date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: schedule.timeZone
        });
    const formatDateInput = (date: Date) => {
        const pad = (value: number) => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const scheduleTimezoneLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: schedule.timeZone,
        timeZoneName: 'short'
    }).format(new Date());

    const formatShortTime = (date: Date) =>
        new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
            timeZone: schedule.timeZone
        }).format(date);

    return (
        <main className="schedule-detail">
            <section className="schedule-hero schedule-hero--detail">
                <div>
                    <Link href="/schedules" className="schedule-back">Back to schedules</Link>
                    <h1>{schedule.name}</h1>
                    <p className="schedule-hero-subtext">
                        {schedule.timeZone} · current time {formatShortTime(now)} ({scheduleTimezoneLabel})
                    </p>
                </div>
                <div className="schedule-hero-actions">
                    <div className={`coverage-pill ${activeBlocks.length > 0 ? 'on' : 'off'}`}>
                        <span className="coverage-dot" />
                        {activeBlocks.length > 0 ? 'On-call active' : 'No coverage'}
                    </div>
                </div>
            </section>

            <div className="schedule-detail-grid">
                <div className="schedule-main">
                    <section className="schedule-panel">
                        <div className="schedule-panel-header">
                            <h3>Layers</h3>
                            <span className="schedule-chip">{schedule.layers.length} layers</span>
                        </div>
                        {schedule.layers.length === 0 ? (
                            <p className="schedule-empty">No layers yet. Add a layer to define rotations.</p>
                        ) : (
                            <div className="layer-list">
                                {schedule.layers.map((layer) => (
                                    <div key={layer.id} className="layer-card">
                                        <div className="layer-header">
                                            <div>
                                                <div className="layer-name">{layer.name}</div>
                        <div className="layer-meta">
                            {formatShortTime(new Date(layer.start))} {schedule.timeZone} · {layer.rotationLengthHours}h rotation
                            {layer.end ? ` · ends ${formatShortTime(new Date(layer.end))}` : ''}
                        </div>
                                            </div>
                                            {canManageSchedules ? (
                                                <form action={deleteLayer.bind(null, schedule.id, layer.id)}>
                                                    <button type="submit" className="layer-delete">Remove</button>
                                                </form>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    disabled 
                                                    className="layer-delete" 
                                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                    title="Admin or Responder role required to delete layers"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        {canManageSchedules ? (
                                            <form action={updateLayer.bind(null, layer.id)} className="layer-settings">
                                                <label className="schedule-field">
                                                    Name
                                                    <input name="name" defaultValue={layer.name} required />
                                                </label>
                                                <label className="schedule-field">
                                                    Rotation (hours)
                                                    <input
                                                        name="rotationLengthHours"
                                                        type="number"
                                                        min="1"
                                                        defaultValue={layer.rotationLengthHours}
                                                        required
                                                    />
                                                </label>
                                                <label className="schedule-field">
                                                    Start
                                                    <input
                                                        type="datetime-local"
                                                        name="start"
                                                        defaultValue={formatDateInput(new Date(layer.start))}
                                                        required
                                                    />
                                                </label>
                                                <label className="schedule-field">
                                                    End
                                                    <input
                                                        type="datetime-local"
                                                        name="end"
                                                        defaultValue={layer.end ? formatDateInput(new Date(layer.end)) : ''}
                                                    />
                                                </label>
                                                <button type="submit" className="glass-button primary">Save</button>
                                            </form>
                                        ) : (
                                            <div className="layer-settings" style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', opacity: 0.7 }}>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                                                    ⚠️ You don't have access to edit layers. Admin or Responder role required.
                                                </p>
                                                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                                                    <label className="schedule-field">
                                                        Name
                                                        <input name="name" defaultValue={layer.name} disabled />
                                                    </label>
                                                    <label className="schedule-field">
                                                        Rotation (hours)
                                                        <input
                                                            name="rotationLengthHours"
                                                            type="number"
                                                            min="1"
                                                            defaultValue={layer.rotationLengthHours}
                                                            disabled
                                                        />
                                                    </label>
                                                    <label className="schedule-field">
                                                        Start
                                                        <input
                                                            type="datetime-local"
                                                            name="start"
                                                            defaultValue={formatDateInput(new Date(layer.start))}
                                                            disabled
                                                        />
                                                    </label>
                                                    <label className="schedule-field">
                                                        End
                                                        <input
                                                            type="datetime-local"
                                                            name="end"
                                                            defaultValue={layer.end ? formatDateInput(new Date(layer.end)) : ''}
                                                            disabled
                                                        />
                                                    </label>
                                                    <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>Save</button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="layer-users">
                                            {layer.users.length === 0 ? (
                                                <p className="schedule-empty">No responders in this layer.</p>
                                            ) : (
                                                layer.users.map((layerUser, index) => (
                                                    <div key={layerUser.userId} className="layer-user">
                                                        <span className="layer-user-name">{layerUser.user.name}</span>
                                                        <div className="layer-user-actions">
                                                            {canManageSchedules ? (
                                                                <>
                                                                    <form action={moveLayerUser.bind(null, layer.id, layerUser.userId, 'up')}>
                                                                        <button type="submit" className="layer-action" disabled={index === 0}>
                                                                            Up
                                                                        </button>
                                                                    </form>
                                                                    <form action={moveLayerUser.bind(null, layer.id, layerUser.userId, 'down')}>
                                                                        <button
                                                                            type="submit"
                                                                            className="layer-action"
                                                                            disabled={index === layer.users.length - 1}
                                                                        >
                                                                            Down
                                                                        </button>
                                                                    </form>
                                                                    <form action={removeLayerUser.bind(null, layer.id, layerUser.userId)}>
                                                                        <button type="submit" className="layer-remove">Remove</button>
                                                                    </form>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button 
                                                                        type="button" 
                                                                        disabled 
                                                                        className="layer-action" 
                                                                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                                        title="Admin or Responder role required"
                                                                    >
                                                                        Up
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        disabled 
                                                                        className="layer-action" 
                                                                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                                        title="Admin or Responder role required"
                                                                    >
                                                                        Down
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        disabled 
                                                                        className="layer-remove" 
                                                                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                                        title="Admin or Responder role required"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {canManageSchedules ? (
                                            <form action={addLayerUser.bind(null, layer.id)} className="layer-add-form">
                                                <select name="userId" required>
                                                    <option value="">Add responder</option>
                                                    {users.map((user) => (
                                                        <option key={user.id} value={user.id}>
                                                            {user.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button type="submit" className="glass-button primary">Add</button>
                                            </form>
                                        ) : (
                                            <div className="layer-add-form" style={{ opacity: 0.7 }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                                                    ⚠️ Admin or Responder role required to add responders
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.5, pointerEvents: 'none' }}>
                                                    <select name="userId" disabled style={{ flex: 1 }}>
                                                        <option value="">Add responder</option>
                                                    </select>
                                                    <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>Add</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {canManageSchedules ? (
                            <form action={createLayer.bind(null, schedule.id)} className="schedule-form layer-create-form">
                                <h4 className="panel-subtitle">Add layer</h4>
                                <label className="schedule-field">
                                    Layer name
                                    <input name="name" placeholder="Primary rotation" required />
                                </label>
                                <label className="schedule-field">
                                    Rotation length (hours)
                                    <input name="rotationLengthHours" type="number" min="1" defaultValue="24" required />
                                </label>
                                <label className="schedule-field">
                                    Start
                                    <input type="datetime-local" name="start" defaultValue={formatDateInput(now)} required />
                                </label>
                                <label className="schedule-field">
                                    End (optional)
                                    <input type="datetime-local" name="end" />
                                </label>
                                <button className="glass-button primary schedule-submit">Create layer</button>
                            </form>
                        ) : (
                            <div className="schedule-form layer-create-form" style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', opacity: 0.7 }}>
                                <h4 className="panel-subtitle" style={{ color: 'var(--text-secondary)' }}>Add layer</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                                    ⚠️ You don't have access to create layers. Admin or Responder role required.
                                </p>
                                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                                    <label className="schedule-field">
                                        Layer name
                                        <input name="name" placeholder="Primary rotation" disabled />
                                    </label>
                                    <label className="schedule-field">
                                        Rotation length (hours)
                                        <input name="rotationLengthHours" type="number" min="1" defaultValue="24" disabled />
                                    </label>
                                    <label className="schedule-field">
                                        Start
                                        <input type="datetime-local" name="start" defaultValue={formatDateInput(now)} disabled />
                                    </label>
                                    <label className="schedule-field">
                                        End (optional)
                                        <input type="datetime-local" name="end" disabled />
                                    </label>
                                    <button type="button" disabled className="glass-button primary schedule-submit" style={{ opacity: 0.5 }}>Create layer</button>
                                </div>
                            </div>
                        )}
                    </section>

                    <ScheduleCalendar shifts={calendarShifts} timeZone={schedule.timeZone} />
                </div>

                <aside className="schedule-side">
                    <div className="schedule-panel">
                        <h3>Current coverage</h3>
                        {activeBlocks.length === 0 ? (
                            <p className="schedule-empty">No one is currently assigned.</p>
                        ) : (
                            <div className="coverage-list">
                                {activeBlocks.map((block) => (
                                    <div key={block.id} className="coverage-item">
                                        <div className="current-avatar">
                                            {block.userName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="current-name">{block.userName}</div>
                                            <div className="current-meta">
                                                {block.layerName} - Until {formatDateTime(block.end)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {nextChange && (
                            <div className="current-next">
                                Next change {formatDateTime(nextChange)}
                            </div>
                        )}
                    </div>

                    <div className="schedule-panel">
                        <h3>Overrides</h3>
                        <p className="schedule-panel-note">
                            Temporarily replace on-call coverage. Times use your browser local time.
                        </p>
                        {canManageSchedules ? (
                            <form action={createOverride.bind(null, schedule.id)} className="schedule-form roster-form">
                                <label className="schedule-field">
                                    On-call user
                                    <select name="userId" required>
                                        <option value="">Select a responder</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="schedule-field">
                                    Replace (optional)
                                    <select name="replacesUserId">
                                        <option value="">Any user</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="schedule-field">
                                    Start
                                    <input type="datetime-local" name="start" required />
                                </label>
                                <label className="schedule-field">
                                    End
                                    <input type="datetime-local" name="end" required />
                                </label>
                                <button className="glass-button primary schedule-submit">Create override</button>
                            </form>
                        ) : (
                            <div className="schedule-form roster-form" style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', opacity: 0.7 }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                                    ⚠️ You don't have access to create overrides. Admin or Responder role required.
                                </p>
                                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                                    <label className="schedule-field">
                                        On-call user
                                        <select name="userId" disabled>
                                            <option value="">Select a responder</option>
                                        </select>
                                    </label>
                                    <label className="schedule-field">
                                        Replace (optional)
                                        <select name="replacesUserId" disabled>
                                            <option value="">Any user</option>
                                        </select>
                                    </label>
                                    <label className="schedule-field">
                                        Start
                                        <input type="datetime-local" name="start" disabled />
                                    </label>
                                    <label className="schedule-field">
                                        End
                                        <input type="datetime-local" name="end" disabled />
                                    </label>
                                    <button type="button" disabled className="glass-button primary schedule-submit" style={{ opacity: 0.5 }}>Create override</button>
                                </div>
                            </div>
                        )}

                        <div className="panel-divider" />

                        <h4 className="panel-subtitle">Upcoming overrides</h4>
                        {upcomingOverrides.length === 0 ? (
                            <p className="schedule-empty">No upcoming overrides.</p>
                        ) : (
                            <div className="roster-list">
                                {upcomingOverrides.map((override) => (
                                    <div key={override.id} className="roster-item">
                                        <div>
                                            <div className="roster-name">{override.user.name}</div>
                                            <div className="roster-meta">
                                                {formatDateTime(new Date(override.start))} - {formatDateTime(new Date(override.end))}
                                            </div>
                                            {override.replacesUser && (
                                                <div className="roster-meta">
                                                    Replaces {override.replacesUser.name}
                                                </div>
                                            )}
                                        </div>
                                        {canManageSchedules ? (
                                            <form action={deleteOverride.bind(null, schedule.id, override.id)}>
                                                <button className="roster-remove" type="submit">Remove</button>
                                            </form>
                                        ) : (
                                            <button 
                                                type="button" 
                                                disabled 
                                                className="roster-remove" 
                                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                title="Admin or Responder role required to remove overrides"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="panel-divider" />

                        <h4 className="panel-subtitle">Override history</h4>
                        {historyOverrides.length === 0 ? (
                            <p className="schedule-empty">No past overrides yet.</p>
                        ) : (
                            <div className="history-list">
                                {historyOverrides.map((override) => (
                                    <div key={override.id} className="history-item">
                                        <div>
                                            <div className="history-name">{override.user.name}</div>
                                            <div className="history-meta">
                                                {formatDateTime(new Date(override.start))} - {formatDateTime(new Date(override.end))}
                                            </div>
                                            {override.replacesUser && (
                                                <div className="history-meta">
                                                    Replaced {override.replacesUser.name}
                                                </div>
                                            )}
                                        </div>
                                        <span className="history-tag">Override</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {historyTotalPages > 1 && (
                            <div className="history-pagination">
                                <Link
                                    href={`/schedules/${schedule.id}?history=${Math.max(1, historyPage - 1)}`}
                                    className={`calendar-nav-button ${historyPage === 1 ? 'disabled' : ''}`}
                                >
                                    Prev
                                </Link>
                                <span className="history-page">
                                    Page {historyPage} of {historyTotalPages}
                                </span>
                                <Link
                                    href={`/schedules/${schedule.id}?history=${Math.min(historyTotalPages, historyPage + 1)}`}
                                    className={`calendar-nav-button ${historyPage === historyTotalPages ? 'disabled' : ''}`}
                                >
                                    Next
                                </Link>
                            </div>
                        )}
                    </div>

                </aside>
            </div>
        </main>
    );
}
