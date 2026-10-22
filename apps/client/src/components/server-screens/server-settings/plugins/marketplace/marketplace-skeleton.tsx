import { Skeleton } from '@sharkord/ui';
import { memo } from 'react';

const MarketplaceSkeleton = memo(() => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-[15px] rounded-[8px] border border-control-border bg-input-surface px-[18px] py-[14px]"
      >
        <Skeleton className="size-[44px] rounded-[8px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-8 w-[94px] rounded-[8px]" />
      </div>
    ))}
  </div>
));

export { MarketplaceSkeleton };
