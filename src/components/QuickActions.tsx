'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/shadcn/dropdown-menu';
import { Button } from '@/components/ui/shadcn/button';
import {
  Plus,
  Zap,
  FileText,
  Server,
  Users,
  Calendar,
  Shield,
  ArrowRight,
  Sparkles,
  Command,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type QuickAction = {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  colorClass: string;
  badge?: string;
  shortcut?: string;
};

type QuickActionsProps = {
  canCreate?: boolean;
};

export default function QuickActions({ canCreate = true }: QuickActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('openQuickCreate', handleOpen);
    return () => window.removeEventListener('openQuickCreate', handleOpen);
  }, []);

  if (!canCreate) {
    return null;
  }

  const quickActions: QuickAction[] = [
    {
      label: 'New Incident',
      href: '/incidents/create',
      description: 'Trigger a new incident response',
      icon: <Zap className="h-4 w-4" />,
      colorClass: 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-100',
      shortcut: 'I',
    },
    {
      label: 'New Postmortem',
      href: '/postmortems/create',
      description: 'Create retrospective report',
      icon: <FileText className="h-4 w-4" />,
      colorClass: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100',
    },
    {
      label: 'New Service',
      href: '/services',
      description: 'Register a new microservice',
      icon: <Server className="h-4 w-4" />,
      colorClass: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100',
      shortcut: 'S',
    },
    {
      label: 'New Team',
      href: '/teams',
      description: 'Create a response team',
      icon: <Users className="h-4 w-4" />,
      colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100',
    },
    {
      label: 'New Schedule',
      href: '/schedules',
      description: 'Set up on-call rotation',
      icon: <Calendar className="h-4 w-4" />,
      colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100',
    },
    {
      label: 'New Policy',
      href: '/policies',
      description: 'Define escalation rules',
      icon: <Shield className="h-4 w-4" />,
      colorClass: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-100',
      badge: 'Admin',
    },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          className="h-9 gap-1.5 font-semibold shadow-sm transition-all duration-300 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-0 overflow-hidden border-2 border-border shadow-2xl bg-white/95 backdrop-blur-xl z-[1050] [zoom:0.8]"
      >
        {/* Compact Header */}
        <div className="relative p-3 bg-gradient-to-br from-primary/90 via-primary to-primary/90 text-primary-foreground overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05]" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 border-2 border-white/20 shadow-md ring-2 ring-white/10 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold truncate leading-none mb-0.5 text-white">
                Create New
              </p>
              <p className="text-[9px] text-primary-foreground/80 font-medium truncate">
                Select a resource type
              </p>
            </div>
          </div>
        </div>

        <div className="p-1 space-y-0.5">
          {quickActions.map((action, index) => (
            <>
              {index === 2 && ( // Separator after Incident/Postmortem
                <div className="px-1 py-0.5">
                  <DropdownMenuSeparator className="bg-border/60" />
                </div>
              )}
              <DropdownMenuItem
                key={action.href}
                onClick={() => router.push(action.href)}
                className="group cursor-pointer focus:bg-muted/60 data-[highlighted]:bg-muted/60 rounded-md py-1.5 px-2 border border-transparent focus:border-border/50 transition-all"
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full mr-2.5 shrink-0 transition-all shadow-sm border',
                    action.colorClass,
                    'group-hover:scale-105 group-hover:shadow'
                  )}
                >
                  {action.icon}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      {action.label}
                    </span>
                    {action.badge && (
                      <span className="px-1 py-0 rounded text-[8px] font-bold bg-muted text-muted-foreground uppercase tracking-wider border">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  {/* Dense mode: Hide description or make it very small? Keeping it very small for now but checking if user wanted it gone. 'very compact' suggests small. */}
                  {action.description && (
                    <span className="text-[9px] text-muted-foreground group-hover:text-foreground/80 transition-colors truncate leading-tight">
                      {action.description}
                    </span>
                  )}
                </div>
                {action.shortcut ? (
                  <DropdownMenuShortcut className="text-[9px] bg-muted px-1 py-0 rounded border border-border/50 opacity-100">
                    ⌘{action.shortcut}
                  </DropdownMenuShortcut>
                ) : (
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                )}
              </DropdownMenuItem>
            </>
          ))}
        </div>

        <div className="p-1.5 bg-muted/30 border-t flex items-center justify-center gap-2">
          <Command className="h-2.5 w-2.5 text-muted-foreground" />
          <p className="text-[9px] text-muted-foreground">
            Press{' '}
            <kbd className="font-mono bg-muted border border-border/50 px-0.5 rounded text-foreground font-medium">
              C
            </kbd>{' '}
            to open
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
