import type { Metadata } from 'next';
import './globals.css';
import WebVitalsReporter from '@/components/WebVitalsReporter';

export const metadata: Metadata = {
  title: 'OpsGuard | Enterprise Incident Management',
  description: 'PagerDuty Clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
