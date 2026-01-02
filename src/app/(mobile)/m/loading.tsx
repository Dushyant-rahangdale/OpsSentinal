import Image from 'next/image';

export default function MobileLoading() {
    return (
        <div className="mobile-route-buffer">
            <div className="mobile-route-buffer-card">
                <div className="mobile-route-buffer-logo">
                    <svg className="mobile-route-buffer-mark" viewBox="0 0 64 64" aria-hidden="true">
                        <path
                            d="M32 8l20 8v14c0 15-10 24-20 28-10-4-20-13-20-28V16l20-8z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M22 34l8 8 14-16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <Image
                        src="/logo-compressed.png"
                        alt="OpsSentinal"
                        width={36}
                        height={36}
                        priority
                        loading="eager"
                        fetchPriority="high"
                        unoptimized
                    />
                </div>
                <div className="mobile-route-buffer-text">
                    <div className="mobile-route-buffer-title">Loading</div>
                    <div className="mobile-route-buffer-subtitle">Syncing the next screen</div>
                </div>
                <div className="mobile-route-buffer-bar">
                    <span />
                </div>
            </div>
            <div className="mobile-route-buffer-skeletons">
                <div className="mobile-route-buffer-skeleton wide" />
                <div className="mobile-route-buffer-skeleton" />
                <div className="mobile-route-buffer-skeleton" />
                <div className="mobile-route-buffer-skeleton wide" />
            </div>
        </div>
    );
}
