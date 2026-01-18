import Image from 'next/image';

export default function MobileLoading() {
  return (
    <div className="mobile-route-buffer">
      <div className="mobile-route-buffer-card">
        <div className="mobile-route-buffer-logo">
          <Image
            src="/logo-compressed.png"
            alt="OpsKnight"
            width={64}
            height={64}
            priority
            loading="eager"
            fetchPriority="high"
            unoptimized
          />
        </div>
        <div className="mobile-route-buffer-bar">
          <span />
        </div>
      </div>
    </div>
  );
}
