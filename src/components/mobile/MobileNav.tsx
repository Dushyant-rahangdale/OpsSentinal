'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MOBILE_NAV_ITEMS } from '@/components/mobile/mobileNavItems';

export default function MobileNav() {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notification count
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/notifications?limit=1');
                if (res.ok) {
                    const data = await res.json();
                    const unread = (data.notifications || []).filter((n: { unread: boolean }) => n.unread).length;
                    setUnreadCount(data.unreadCount || unread);
                }
            } catch {
                // Silent fail
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (href: string) => {
        if (href === '/m' && pathname === '/m') return true;
        if (href !== '/m' && pathname.startsWith(href)) return true;
        return false;
    };

    return (
        <nav className="mobile-nav">
            {MOBILE_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-nav-item ${active ? 'active' : ''}`}
                    >
                        <span className="mobile-nav-icon" style={{ position: 'relative' }}>
                            {item.icon}
                            {/* Notification badge */}
                            {'hasBadge' in item && item.hasBadge && unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-6px',
                                    minWidth: '16px',
                                    height: '16px',
                                    borderRadius: '8px',
                                    background: '#dc2626',
                                    color: 'white',
                                    fontSize: '0.6rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 3px'
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </span>
                        <span className="mobile-nav-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

