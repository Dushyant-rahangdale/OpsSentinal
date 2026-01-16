import type { Metadata, Viewport } from 'next';
import '@/styles/index.css';
import { Providers } from './providers';
import VersionCheck from '@/components/VersionCheck';

export const metadata: Metadata = {
  title: 'OpsSentinal | Enterprise Incident Management',
  description: 'Enterprise incident management and response platform',
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
    <html lang="en" suppressHydrationWarning className="light" data-theme="light">
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="darkreader-lock" />
      </head>
      <body>
        <Providers>
          <VersionCheck />
          {children}
        </Providers>
      </body>
    </html>
  );
}
