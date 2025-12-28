'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Activity,
    Bell,
    Building2,
    CreditCard,
    Globe,
    Home,
    KeyRound,
    List,
    Plug,
    Search,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    User,
    Users
} from 'lucide-react';
import { SETTINGS_NAV_SECTIONS } from '@/components/settings/navConfig';

type Props = {
    isAdmin?: boolean;
    isResponderOrAbove?: boolean;
    variant?: 'sidebar' | 'drawer';
    onNavigate?: () => void;
};

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    home: Home,
    user: User,
    settings: Settings,
    shield: ShieldCheck,
    key: KeyRound,
    bell: Bell,
    globe: Globe,
    list: List,
    plug: Plug,
    search: Search,
    sliders: SlidersHorizontal,
    activity: Activity,
    'credit-card': CreditCard,
    building: Building2,
    users: Users,
    slack: Plug
};

export default function SettingsNav({
    isAdmin = false,
    isResponderOrAbove = false,
    variant = 'sidebar',
    onNavigate
}: Props) {
    const pathname = usePathname();

    const isItemDisabled = (item: { requiresAdmin?: boolean; requiresResponder?: boolean }) => {
        if (item.requiresAdmin && !isAdmin) return true;
        if (item.requiresResponder && !isResponderOrAbove) return true;
        return false;
    };

    return (
        <nav className={`settings-nav-v2 ${variant}`}>
            {SETTINGS_NAV_SECTIONS.map((section) => (
                <div key={section.id} className="settings-nav-group-v2">
                    <div className="settings-nav-group-label">{section.label}</div>
                    <div className="settings-nav-group-items">
                        {section.items.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const disabled = isItemDisabled(item);
                            const Icon = iconMap[item.icon] ?? Settings;

                            if (disabled) {
                                return (
                                    <div key={item.id} className="settings-nav-item-v2 is-disabled" aria-disabled="true">
                                        <div className="settings-nav-icon">
                                            <Icon size={18} />
                                        </div>
                                        <div className="settings-nav-text">
                                            <span>{item.label}</span>
                                            <small>{item.description}</small>
                                        </div>
                                        <span className="settings-nav-badge">{item.requiresAdmin ? 'Admin' : 'Responder+'}</span>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`settings-nav-item-v2 ${active ? 'is-active' : ''}`}
                                    aria-current={active ? 'page' : undefined}
                                    onClick={onNavigate}
                                >
                                    <div className="settings-nav-icon">
                                        <Icon size={18} />
                                    </div>
                                    <div className="settings-nav-text">
                                        <span>{item.label}</span>
                                        <small>{item.description}</small>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
