import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import MobileCard from '@/components/mobile/MobileCard';
import { MobileAvatar } from '@/components/mobile/MobileUtils';
import MobileButton from '@/components/mobile/MobileButton';
import MobileThemeToggle from '@/components/mobile/MobileThemeToggle';
import PushNotificationToggle from '@/components/mobile/PushNotificationToggle';

export const dynamic = 'force-dynamic';

export default async function MobileMorePage() {
    const session = await getServerSession(await getAuthOptions());

    const user = session?.user?.email
        ? await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { name: true, email: true, role: true },
        })
        : null;

    return (
        <div className="mobile-dashboard">
            {/* User Info Card */}
            <MobileCard className="mobile-metric-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <MobileAvatar
                        name={user?.name || 'User'}
                        size="lg"
                    />
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                        <div style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            background: 'var(--badge-neutral-bg)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            marginTop: '0.375rem',
                        }}>
                            {user?.role || 'user'}
                        </div>
                    </div>
                </div>
            </MobileCard>

            <MobileThemeToggle />
            <PushNotificationToggle />

            {/* Quick Links Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MobileCard padding="none">
                    <MenuLink href="/m/teams" icon="👥" label="Teams" />
                    <MenuLink href="/m/users" icon="👤" label="Users" />
                    <MenuLink href="/m/schedules" icon="📅" label="Schedules" />
                    <MenuLink href="/m/policies" icon="🛡️" label="Escalation Policies" border={false} />
                </MobileCard>

                <MobileCard padding="none">
                    <MenuLink href="/m/analytics" icon="📊" label="Analytics" />
                    <MenuLink href="/m/postmortems" icon="📝" label="Postmortems" />
                    <MenuLink href="/m/status" icon="🌐" label="Status Page" border={false} />
                </MobileCard>

                <MobileCard padding="none">
                    <MenuLink href="/settings/profile" icon="⚙️" label="Settings" />
                    <MenuLink href="/help" icon="❓" label="Help & Documentation" border={false} />
                </MobileCard>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <MobileButton
                    href="/api/prefer-desktop"
                    variant="secondary"
                    fullWidth
                    style={{ justifyContent: 'center' }}
                >
                    🖥️ Switch to Desktop Mode
                </MobileButton>

                <MobileButton
                    href="/api/auth/signout"
                    variant="danger"
                    fullWidth
                    style={{ justifyContent: 'center', background: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', border: 'none' }}
                >
                    Sign Out
                </MobileButton>
            </div>

            <div style={{
                textAlign: 'center',
                marginTop: '2rem',
                marginBottom: '1rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
            }}>
                OpsSentinal Mobile v1.0.0
            </div>
        </div>
    );
}

function MenuLink({
    href,
    icon,
    label,
    border = true
}: {
    href: string;
    icon: string;
    label: string;
    border?: boolean;
}) {
    return (
        <Link
            href={href}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '1rem',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                borderBottom: border ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s',
            }}
        >
            <span style={{ fontSize: '1.25rem', width: '24px', textAlign: 'center' }}>{icon}</span>
            <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{label}</span>
            <svg
                style={{ marginLeft: 'auto' }}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
            >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </Link>
    );
}
