type Props = {
    tone: 'ok' | 'danger';
    label: string;
    detail: string;
};

export default function OperationalStatus({ tone, label, detail }: Props) {
    return (
        <div className="ops-status">
            <div className={`ops-pulse ${tone}`} />
            <div className="ops-text">
                <span className="ops-label">Operational Status</span>
                <span className="ops-value">{label}</span>
            </div>
            <span className="ops-detail">{detail}</span>
        </div>
    );
}
