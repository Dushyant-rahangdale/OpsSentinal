'use client';

type Props = {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export default function SettingsSectionCard({ title, description, action, children, className = '' }: Props) {
    return (
        <section className={`settings-section-card ${className}`.trim()}>
            <div className="settings-section-card-header">
                <div>
                    <h2>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
                {action && <div className="settings-section-card-action">{action}</div>}
            </div>
            <div className="settings-section-card-body">
                {children}
            </div>
        </section>
    );
}
