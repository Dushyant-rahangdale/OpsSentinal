'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ToastProvider';
import { TimezoneProvider } from '@/contexts/TimezoneContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TimezoneProvider>
          <ToastProvider>{children}</ToastProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
