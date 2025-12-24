'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopbarBreadcrumbs() {
    const pathname = usePathname();
    
    // Don't show breadcrumbs on home page
    if (pathname === '/') {
        return null;
    }

    const segments = pathname.split('/').filter(Boolean);
    
    const breadcrumbs = segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        return {
            href,
            label,
            isLast: index === segments.length - 1
        };
    });

    return (
        <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
            <ol className="topbar-breadcrumbs-list">
                <li className="topbar-breadcrumb-item">
                    <Link href="/" className="topbar-breadcrumb-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
                        </svg>
                        <span>Home</span>
                    </Link>
                </li>
                {breadcrumbs.map((breadcrumb, index) => (
                    <li key={breadcrumb.href} className="topbar-breadcrumb-item">
                        <svg 
                            className="topbar-breadcrumb-separator"
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                        >
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {breadcrumb.isLast ? (
                            <span className="topbar-breadcrumb-current">{breadcrumb.label}</span>
                        ) : (
                            <Link href={breadcrumb.href} className="topbar-breadcrumb-link">
                                {breadcrumb.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}


