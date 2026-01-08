'use client';

import { Button } from '@/components/ui/shadcn/button';
import { useSidebar } from '@/contexts/SidebarContext';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarTriggerProps {
  className?: string;
}

export default function SidebarTrigger({ className }: SidebarTriggerProps) {
  const { toggleSidebar, isCollapsed, isMobile } = useSidebar();

  // Don't show on mobile - mobile has hamburger menu
  if (isMobile) return null;

  const label = isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={label}
      aria-expanded={!isCollapsed}
      title={label}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      className={cn('sidebar-trigger shrink-0', className)}
    >
      {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
    </Button>
  );
}
