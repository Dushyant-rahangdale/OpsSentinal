'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/settings/profile', label: 'Profile', description: 'Name, email, and role' },
    { href: '/settings/preferences', label: 'Preferences', description: 'Timezone and notifications' },
    { href: '/settings/security', label: 'Security', description: 'Password and sessions' },
    { href: '/settings/api-keys', label: 'API keys', description: 'Integration credentials' }
];

export default function SettingsNav() {
    const pathname = usePathname();

    return (
        <nav className="settings-nav">
            {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`settings-link ${active ? 'active' : ''}`}
                    >
                        <span className="settings-link-label">{item.label}</span>
                        <span className="settings-link-desc">{item.description}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
