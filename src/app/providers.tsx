'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ToastProvider';
import { Toaster } from '@/components/ui/shadcn/sonner';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { KeyboardShortcutsProvider } from '@/components/KeyboardShortcutsProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TimezoneProvider>
          <ToastProvider>
            <KeyboardShortcutsProvider>
              {children}
            </KeyboardShortcutsProvider>
            <Toaster position="top-right" richColors closeButton />
          </ToastProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

