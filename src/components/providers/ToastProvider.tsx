'use client';

import { Toaster } from '@/components/ui/shadcn/sonner';
import { useTheme } from 'next-themes';

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      theme={theme as 'light' | 'dark' | 'system'}
    />
  );
}
