import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google'; // [NEW]
import '@/styles/index.css';
import { Providers } from './providers';
import VersionCheck from '@/components/VersionCheck';

// Initialize fonts
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpsKnight | Enterprise Incident Management',
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
    title: 'OpsKnight',
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
      <body className={`${manrope.variable} antialiased`}>
        <Providers>
          <VersionCheck />
          {children}
        </Providers>
      </body>
    </html>
  );
}
