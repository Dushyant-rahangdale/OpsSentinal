'use client';

import { Skeleton } from '@/components/ui/shadcn/skeleton';

interface UserCardSkeletonProps {
  count?: number;
}

export function UserCardSkeleton({ count = 1 }: UserCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border-2 border-l-4 border-border bg-card animate-pulse"
        >
          {/* Checkbox skeleton */}
          <Skeleton className="h-4 w-4 rounded" />

          {/* Avatar skeleton */}
          <Skeleton className="h-12 w-12 rounded-full" />

          {/* User info skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>

          {/* Badges skeleton */}
          <div className="flex flex-col items-end gap-2 min-w-[200px]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-6 w-28 rounded" />
          </div>

          {/* Actions skeleton */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export function UserListSkeleton() {
  return (
    <div className="space-y-3">
      <UserCardSkeleton count={5} />
    </div>
  );
}
