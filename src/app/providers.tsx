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
  const themeProps = isMobileRoute
    ? { defaultTheme: 'system' as const, enableSystem: true }
    : { forcedTheme: 'light' as const, defaultTheme: 'light' as const, enableSystem: false };

  return (
    <ThemeProvider attribute={['class', 'data-theme']} disableTransitionOnChange {...themeProps}>
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
          </ToastProvider>
          <Toaster position="top-right" richColors closeButton />
        </TimezoneProvider>
      </AppThemeProvider>
    </SessionProvider>
  );
}
