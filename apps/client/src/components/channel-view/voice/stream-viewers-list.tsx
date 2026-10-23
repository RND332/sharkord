import { useUsers } from '@/features/server/users/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@dodecagon/ui';
import { EyeIcon } from '@heroicons/react/20/solid';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '../../user-avatar';

type TStreamViewersListProps = {
  viewerIds: number[];
};

const StreamViewersList = memo(({ viewerIds }: TStreamViewersListProps) => {
  const { t } = useTranslation('common');
  const users = useUsers();
  const [viewersOpen, setViewersOpen] = useState(false);

  const viewerCount = viewerIds.length;
  const shownViewerIds = viewerIds.slice(0, 4);
  const overflowViewerCount = Math.max(0, viewerCount - shownViewerIds.length);
  const viewerNames = useMemo(
    () => new Map(users.map((viewer) => [viewer.id, viewer.name])),
    [users]
  );
  const onViewersOpenChange = useCallback(
    (open: boolean) => setViewersOpen(open),
    []
  );
  const onViewersPointerDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => event.stopPropagation(),
    []
  );

  // The trigger stays visible with an empty roster: the Paper design keeps the
  // eye and the count on screen, so the roster is always reachable.
  return (
    <Popover open={viewersOpen} onOpenChange={onViewersOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={onViewersPointerDown}
          aria-label={t('screenShareViewers', { count: viewerCount })}
          className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-black/65 px-1.5 text-[13px] font-medium leading-[17px] text-white transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {viewerCount > 0 && (
            <span className="flex -space-x-1.5">
              {shownViewerIds.map((viewerId) => (
                <UserAvatar
                  key={viewerId}
                  userId={viewerId}
                  className="size-[22px] ring-2 ring-black/70"
                  showStatusBadge={false}
                />
              ))}
            </span>
          )}
          {overflowViewerCount > 0 && (
            <span className="tabular-nums text-white/80">
              +{overflowViewerCount}
            </span>
          )}
          <EyeIcon aria-hidden="true" className="size-3.5" />
          <span className="tabular-nums">{viewerCount}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[272px] gap-0 p-0"
      >
        <div className="border-b border-line px-3 py-2 text-xs font-semibold text-muted-foreground">
          {t('watching')} · {viewerCount}
        </div>
        {viewerCount === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {t('noOneWatching')}
          </p>
        ) : (
          <div className="max-h-[294px] overflow-y-auto p-1">
            {viewerIds.map((viewerId) => (
              <div
                key={viewerId}
                className="flex h-11 items-center gap-2 rounded-md px-2 text-sm"
              >
                <UserAvatar userId={viewerId} className="size-8" />
                <span className="truncate">
                  {viewerNames.get(viewerId) ?? t('unknownUser')}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

StreamViewersList.displayName = 'StreamViewersList';

export { StreamViewersList };
