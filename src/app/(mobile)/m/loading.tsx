import { MobileSkeleton } from '@/components/mobile/MobileUtils';

export default function MobileLoading() {
    return (
        <div className="mobile-dashboard">
            <div style={{ marginBottom: '1rem' }}>
                <MobileSkeleton className="h-8 w-48 mb-2" />
                <MobileSkeleton className="h-4 w-32" />
            </div>

            <div className="mobile-metrics-grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="mobile-metric-card">
                        <MobileSkeleton className="h-8 w-12 mb-1" />
                        <MobileSkeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <div className="mobile-section-header">
                    <MobileSkeleton className="h-6 w-32" />
                    <MobileSkeleton className="h-4 w-16" />
                </div>
                <div className="mobile-incident-list">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="mobile-incident-card">
                            <div style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <MobileSkeleton className="h-5 w-16 rounded-full" />
                                    <MobileSkeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <MobileSkeleton className="h-6 w-3/4 mb-2" />
                                <MobileSkeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
