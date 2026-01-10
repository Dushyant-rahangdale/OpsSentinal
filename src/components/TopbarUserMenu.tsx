'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shadcn/avatar';
import { Button } from '@/components/ui/shadcn/button';
import { Settings, LogOut, User, Keyboard, HelpCircle } from 'lucide-react';
import { getDefaultAvatar } from '@/lib/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  name: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  gender: string | null;
  userId: string;
};

export default function TopbarUserMenu({ name, email, role, avatarUrl, gender, userId }: Props) {
  const finalAvatarUrl = avatarUrl || getDefaultAvatar(gender, name || email || 'User');
  const initials = (name || email || 'U').slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full p-0 transition-all duration-300 hover:scale-105 group ring-0 focus-visible:ring-2 focus-visible:ring-offset-2 overflow-hidden"
        >
          {/* 1. Outer Gradient Frame */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-muted to-primary/20 group-hover:from-primary/40 group-hover:via-primary/10 group-hover:to-primary/40 transition-all duration-500" />

          {/* 2. White/Background Gap */}
          <div className="absolute inset-[2px] rounded-full bg-background" />

          {/* 3. Avatar Image */}
          <Avatar className="absolute inset-[3px] h-[calc(100%-6px)] w-[calc(100%-6px)] rounded-full border border-black/5 dark:border-white/10 shadow-sm">
            <AvatarImage
              src={finalAvatarUrl}
              alt={name || 'User'}
              className="object-cover h-full w-full"
            />
            <AvatarFallback className="flex items-center justify-center h-full w-full bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-bold text-[10px]">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* 4. Online Status Dot */}
          <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-[1.5px] border-background bg-emerald-500 shadow-sm z-20" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 p-0 overflow-hidden border-2 border-border shadow-2xl bg-white/95 backdrop-blur-xl z-[1050] [zoom:0.8]"
        align="end"
        forceMount
      >
        {/* Compact Header */}
        <div className="relative p-3 bg-gradient-to-br from-primary/90 via-primary to-primary/90 text-primary-foreground overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

          <div className="relative z-10 flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border-2 border-white/20 shadow-md ring-2 ring-white/10">
              <AvatarImage src={finalAvatarUrl} />
              <AvatarFallback className="bg-white/10 text-white backdrop-blur-md text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold truncate leading-none mb-0.5 text-white">
                {name || 'User'}
              </p>
              <p className="text-[9px] text-white/70 font-medium truncate mb-0.5">{email}</p>
              {role && (
                <div className="inline-flex self-start">
                  {(() => {
                    const roleKey = (role?.toLowerCase() || 'admin') as keyof typeof roleColors;
                    const roleColors = {
                      admin: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
                      responder: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
                      observer: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                      user: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
                    };
                    const activeColor = roleColors[roleKey] || roleColors.user;

                    return (
                      <span
                        className={cn(
                          'px-1 py-0 rounded text-[8px] font-medium uppercase tracking-wider border shadow-sm backdrop-blur-md',
                          activeColor
                        )}
                      >
                        {role}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-1 space-y-0.5">
          <DropdownMenuGroup>
            <DropdownMenuItem
              asChild
              className="group cursor-pointer focus:bg-muted/60 data-[highlighted]:bg-muted/60 rounded-md py-1.5 border border-transparent focus:border-border/50 transition-all font-medium"
            >
              <Link href="/settings/profile" className="flex items-center w-full px-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 mr-2.5 group-hover:bg-blue-100 group-hover:scale-105 transition-all shadow-sm border border-blue-100">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-xs font-semibold text-foreground">My Profile</span>
                  <span className="text-[9px] text-muted-foreground group-hover:text-foreground/80 transition-colors leading-tight">
                    Details & preferences
                  </span>
                </div>
                <DropdownMenuShortcut className="text-[9px] bg-muted px-1 py-0 rounded border border-border/50">
                  ⇧⌘P
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              asChild
              className="group cursor-pointer focus:bg-muted/60 data-[highlighted]:bg-muted/60 rounded-md py-1.5 mt-0.5 border border-transparent focus:border-border/50 transition-all font-medium"
            >
              <Link href="/settings" className="flex items-center w-full px-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-purple-600 mr-2.5 group-hover:bg-purple-100 group-hover:scale-105 transition-all shadow-sm border border-purple-100">
                  <Settings className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-xs font-semibold text-foreground">Settings</span>
                  <span className="text-[9px] text-muted-foreground group-hover:text-foreground/80 transition-colors leading-tight">
                    System configuration
                  </span>
                </div>
                <DropdownMenuShortcut className="text-[9px] bg-muted px-1 py-0 rounded border border-border/50">
                  ⌘S
                </DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <div className="px-1 py-0.5">
            <DropdownMenuSeparator className="bg-border/60" />
          </div>

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new CustomEvent('toggleKeyboardShortcuts'))}
              className="group cursor-pointer focus:bg-muted/60 rounded-md py-1.5 px-2 font-medium"
            >
              <Keyboard className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs">Keyboard Shortcuts</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="group cursor-pointer focus:bg-muted/60 rounded-md py-1.5 px-2 font-medium"
            >
              <Link href="/help" className="flex items-center w-full">
                <HelpCircle className="mr-2.5 h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs">Help & Documentation</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <div className="px-1 py-0.5">
            <DropdownMenuSeparator className="bg-border/60" />
          </div>

          <DropdownMenuItem
            className="group cursor-pointer focus:bg-red-50 focus:text-red-600 rounded-md py-1.5 text-red-600 mt-0.5 border border-transparent focus:border-red-100 transition-all font-medium px-2"
            onClick={() => (window.location.href = '/api/auth/signout')}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-500 mr-2.5 group-hover:bg-red-100 group-hover:scale-105 transition-all shadow-sm border border-red-100">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-xs">Sign Out</span>
            <DropdownMenuShortcut className="text-[9px] bg-red-100/50 text-red-600 px-1 py-0 rounded border border-red-200">
              ⇧⌘Q
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
