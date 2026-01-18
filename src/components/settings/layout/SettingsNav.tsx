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
  Users,
} from 'lucide-react';
import { SETTINGS_NAV_SECTIONS } from '@/components/settings/navConfig';
import { cn } from '@/lib/utils';

type Props = {
  isAdmin?: boolean;
  isResponderOrAbove?: boolean;
  variant?: 'sidebar' | 'drawer';
  onNavigate?: () => void;
};

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
  slack: Plug,
};

export default function SettingsNav({
  isAdmin = false,
  isResponderOrAbove = false,
  variant = 'sidebar',
  onNavigate,
}: Props) {
  const pathname = usePathname();

  const isItemDisabled = (item: { requiresAdmin?: boolean; requiresResponder?: boolean }) => {
    if (item.requiresAdmin && !isAdmin) return true;
    if (item.requiresResponder && !isResponderOrAbove) return true;
    return false;
  };

  return (
    <nav
      className={cn(
        'flex flex-col gap-6 p-4 bg-card border border-border rounded-xl',
        variant === 'drawer' && 'p-0 border-0 bg-transparent'
      )}
    >
      {SETTINGS_NAV_SECTIONS.map(section => (
        <div key={section.id} className="flex flex-col gap-2">
          <div className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {section.label}
          </div>
          <div className="flex flex-col gap-1">
            {section.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const disabled = isItemDisabled(item);
              const Icon = iconMap[item.icon] ?? Settings;

              if (disabled) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-3 py-3 rounded-lg bg-muted/50 opacity-60 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <Icon size={24} className="text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </div>
                    <span className="ml-auto text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                      {item.requiresAdmin ? 'Admin' : 'Responder+'}
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-accent/50',
                    active && 'bg-accent border-l-2 border-primary'
                  )}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon
                    size={24}
                    className={cn(
                      'flex-shrink-0 transition-colors duration-200',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span
                      className={cn('text-sm font-medium truncate', active && 'text-foreground')}
                    >
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </span>
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
