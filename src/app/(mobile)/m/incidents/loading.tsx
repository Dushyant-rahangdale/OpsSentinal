import { IncidentCardSkeleton, Skeleton } from '@/components/mobile/SkeletonLoader';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <Skeleton width="160px" height="22px" borderRadius="6px" />
        <Skeleton width="70px" height="18px" borderRadius="999px" />
      </div>
      <div className="flex flex-col gap-3">
        <IncidentCardSkeleton />
        <IncidentCardSkeleton />
        <IncidentCardSkeleton />
      </div>
    </div>
  );
}
