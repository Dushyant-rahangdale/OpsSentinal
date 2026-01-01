'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    {
        href: '/m',
        label: 'Home',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
            </svg>
        ),
    },
    {
        href: '/m/incidents',
        label: 'Incidents',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        href: '/m/services',
        label: 'Services',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        ),
    },
    {
        href: '/m/more',
        label: 'More',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
            </svg>
        ),
    },
];

export default function MobileNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/m' && pathname === '/m') return true;
        if (href !== '/m' && pathname.startsWith(href)) return true;
        return false;
    };

    return (
        <nav className="mobile-nav">
            {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-nav-item ${active ? 'active' : ''}`}
                    >
                        <span className="mobile-nav-icon">{item.icon}</span>
                        <span className="mobile-nav-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
