'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import SettingsNav from '@/components/settings/layout/SettingsNav';
import { CommandPalette } from '@/components/settings/layout/CommandPalette';
import { Button } from '@/components/ui/shadcn/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/shadcn/sheet';
import { cn } from '@/lib/utils';

type Props = {
    isAdmin: boolean;
    isResponderOrAbove: boolean;
    children: React.ReactNode;
};

export default function SettingsLayoutShell({ isAdmin, isResponderOrAbove, children }: Props) {
    const pathname = usePathname();
    const isStatusPage = pathname === '/settings/status-page' || pathname.startsWith('/settings/status-page/');
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <main className="max-w-[1400px] w-full mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
            <CommandPalette />

            {/* Header */}
            <header className="mb-6 md:mb-8 pb-4 md:pb-6 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {isStatusPage ? 'Status Page Settings' : 'Settings'}
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            {isStatusPage
                                ? 'Configure your public status page with detailed customization options.'
                                : 'Manage your account preferences, security, and system configuration.'}
                        </p>
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="lg:hidden">
                                <Menu size={20} />
                                <span className="sr-only">Open navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
                            <SheetHeader>
                                <SheetTitle>Settings Navigation</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 overflow-y-auto max-h-[calc(70vh-80px)]">
                                <SettingsNav
                                    isAdmin={isAdmin}
                                    isResponderOrAbove={isResponderOrAbove}
                                    variant="drawer"
                                    onNavigate={() => setSheetOpen(false)}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* Layout Grid */}
            <div
                className={cn(
                    'grid gap-6 lg:gap-8',
                    !isStatusPage && 'lg:grid-cols-[280px_1fr]'
                )}
            >
                {/* Desktop Sidebar */}
                {!isStatusPage && (
                    <aside className="hidden lg:block sticky top-6 self-start">
                        <SettingsNav isAdmin={isAdmin} isResponderOrAbove={isResponderOrAbove} />
                    </aside>
                )}

                {/* Main Content */}
                <section className="min-w-0 space-y-6">
                    {children}
                </section>
            </div>
        </main>
    );
}
