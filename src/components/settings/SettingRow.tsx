'use client';

type Props = {
    label: string;
    description?: string;
    helpText?: string;
    error?: string | null;
    children: React.ReactNode;
    className?: string;
};

export default function SettingRow({ label, description, helpText, error, children, className = '' }: Props) {
    return (
        <div className={`settings-row-v2 ${className}`.trim()}>
            <div className="settings-row-label">
                <h3>{label}</h3>
                {description && <p>{description}</p>}
            </div>
            <div className="settings-row-control">
                {children}
                {helpText && <div className="settings-row-help">{helpText}</div>}
                {error && <div className="settings-row-error">{error}</div>}
            </div>
        </div>
    );
}
