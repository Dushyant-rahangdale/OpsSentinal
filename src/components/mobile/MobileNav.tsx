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
          const unread = (data.notifications || []).filter(
            (n: { unread: boolean }) => n.unread
          ).length;
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

  // Calculate active index for slider position
  const activeIndex = MOBILE_NAV_ITEMS.findIndex(item => isActive(item.href));

  return (
    <nav className="mobile-nav">
      {/* Animated active indicator */}
      <div
        className="mobile-nav-slider"
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {MOBILE_NAV_ITEMS.map((item, index) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon" style={{ position: 'relative' }}>
              {active ? item.iconActive : item.icon}
              {/* Notification badge */}
              {'hasBadge' in item && item.hasBadge && unreadCount > 0 && (
                <span className="mobile-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </span>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
