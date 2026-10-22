import { cn } from '@/lib/utils';
import type { TIconButtonSize } from '@dodecagon/ui';

// cards shrink to the thumbnail strip when another card is pinned
const cardDensity = (isCompact: boolean) => ({
  inset: isCompact ? 'p-1' : 'p-3',
  label: 'text-[13px] font-semibold leading-[18px]',
  icon: (isCompact ? 'xs' : 'sm') as TIconButtonSize
});

const cardBadgeClass = (isCompact: boolean) =>
  cn(
    'inline-flex min-w-0 items-center bg-black/55 rounded-[6px] overflow-hidden truncate',
    isCompact ? 'h-6 gap-2 px-2' : 'h-6.5 gap-2 px-2.5'
  );

const cardControlsClass = (isCompact: boolean) =>
  cn(
    'inline-flex items-center bg-black/70 rounded gap-0.5 px-1',
    isCompact ? 'h-6' : 'h-7'
  );

const cardControlClass = (isActive?: boolean) =>
  cn(
    'rounded p-1 shrink-0 hover:bg-white/10',
    isActive &&
      'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
  );

export { cardBadgeClass, cardControlClass, cardControlsClass, cardDensity };
