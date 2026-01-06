import type { Metadata, Viewport } from 'next';
import '@/styles/index.css';
import { Providers } from './providers';
import VersionCheck from '@/components/VersionCheck';

export const metadata: Metadata = {
  title: 'OpsSentinal | Enterprise Incident Management',
  description: 'PagerDuty Clone',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OpsSentinel',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <VersionCheck />
          {children}
        </Providers>
      </body>
    </html>
  );
}
