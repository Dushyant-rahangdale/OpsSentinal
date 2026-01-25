'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ToastProvider';
import { Toaster } from '@/components/ui/shadcn/sonner';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { KeyboardShortcutsProvider } from '@/components/KeyboardShortcutsProvider';

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobileRoute = pathname?.startsWith('/m');
  const themeProps = isMobileRoute ? {} : { forcedTheme: 'light' as const };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppThemeProvider>
        <TimezoneProvider>
          <ToastProvider>
            <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
            <Toaster position="top-right" richColors closeButton />
          </ToastProvider>
        </TimezoneProvider>
      </AppThemeProvider>
    </SessionProvider>
  );
}
