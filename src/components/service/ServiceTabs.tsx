'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type ServiceTabsProps = {
    serviceId: string;
};

export default function ServiceTabs({ serviceId }: ServiceTabsProps) {
    const pathname = usePathname();
    
    const tabs = [
        { href: `/services/${serviceId}`, label: 'Overview' },
        { href: `/services/${serviceId}/integrations`, label: 'Integrations' },
        { href: `/services/${serviceId}/settings`, label: 'Settings' }
    ];
    
    return (
        <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            borderBottom: '1px solid var(--border)',
            marginTop: '1rem'
        }}>
            {tabs.map(tab => {
                const isActive = pathname === tab.href;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        style={{ 
                            padding: '0.75rem 1.5rem',
                            textDecoration: 'none',
                            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                            borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                            marginBottom: '-1px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}










