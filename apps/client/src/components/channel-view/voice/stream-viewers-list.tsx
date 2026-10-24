import { useUsers } from '@/features/server/users/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@dodecagon/ui';
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
  const shownViewerIds = viewerIds.slice(0, 3);
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

  // the design shows the roster as overlapping avatars without a capsule, so
  // an empty roster renders nothing at all
  if (viewerCount === 0) {
    return null;
  }

  return (
    <Popover open={viewersOpen} onOpenChange={onViewersOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseDown={onViewersPointerDown}
          aria-label={t('screenShareViewers', { count: viewerCount })}
          className="flex items-center gap-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex -space-x-2">
            {shownViewerIds.map((viewerId) => (
              <UserAvatar
                key={viewerId}
                userId={viewerId}
                className="size-7 border border-rail"
                showStatusBadge={false}
              />
            ))}
          </span>
          {overflowViewerCount > 0 && (
            <span className="flex size-7 items-center justify-center rounded-full bg-raised text-[11px] font-medium tabular-nums text-foreground">
              +{overflowViewerCount}
            </span>
          )}
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
