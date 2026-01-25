'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, type CSSProperties } from 'react';
import { MOBILE_NAV_ITEMS, MOBILE_MORE_ROUTES } from '@/components/mobile/mobileNavItems';

export default function MobileNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const moreIndex = MOBILE_NAV_ITEMS.findIndex(item => item.href === '/m/more');

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

  const resolveActiveIndex = () => {
    const directIndex = MOBILE_NAV_ITEMS.findIndex(item => {
      if (item.href === '/m') return pathname === '/m';
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
    if (directIndex >= 0) return directIndex;
    if (
      moreIndex >= 0 &&
      MOBILE_MORE_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
    ) {
      return moreIndex;
    }
    return -1;
  };

  // Calculate active index for slider position
  const activeIndex = resolveActiveIndex();
  const sliderIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <nav
      className="mobile-nav"
      style={
        {
          display: 'grid',
          gridTemplateColumns: `repeat(${MOBILE_NAV_ITEMS.length}, 1fr)`,
          '--mobile-nav-count': MOBILE_NAV_ITEMS.length,
        } as CSSProperties
      }
    >
      {/* Animated active indicator */}
      <div
        className="mobile-nav-slider"
        style={{
          width: '100%',
          transform: `translateX(${sliderIndex * 100}%)`,
        }}
      />
      {MOBILE_NAV_ITEMS.map((item, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
            style={{ maxWidth: 'unset' }}
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
