'use client';

import { ReactNode } from 'react';

type Props = {
    title: string;
    description?: string;
    children: ReactNode;
    icon?: ReactNode;
    className?: string;
    contentClassName?: string;
};

export default function SettingsSection({ title, description, children, icon, className = '', contentClassName = '' }: Props) {
    return (
        <div className={`settings-section ${className}`.trim()}>
            <header className="settings-section-header">
                {icon && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        {icon}
                        <h2 style={{ margin: 0 }}>{title}</h2>
                    </div>
                )}
                {!icon && <h2>{title}</h2>}
                {description && <p>{description}</p>}
            </header>
            <div className={`settings-section-content ${contentClassName}`.trim()}>
                {children}
            </div>
        </div>
    );
}

