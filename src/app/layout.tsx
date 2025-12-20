import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpsGuard | Enterprise Incident Management',
  description: 'PagerDuty Clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
