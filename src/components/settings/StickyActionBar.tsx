type Props = {
    children: React.ReactNode;
    align?: 'start' | 'end' | 'space-between';
    className?: string;
};

export default function StickyActionBar({ children, align = 'end', className = '' }: Props) {
    return (
        <div className={`settings-action-bar ${align} ${className}`.trim()}>
            {children}
        </div>
    );
}
