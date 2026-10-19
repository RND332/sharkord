import { closeThreadSidebar } from '@/features/app/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { IconButton } from '@sharkord/ui';
import { Hash, X } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TThreadHeaderProps = {
  channelId: number;
};

const ThreadHeader = memo(({ channelId }: TThreadHeaderProps) => {
  const { t } = useTranslation('common');
  const channel = useChannelById(channelId);
  const channelName = channel?.name ?? t('unknownChannel');

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Hash className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="truncate text-sm font-semibold">
          {t('threadInChannel', { name: channelName })}
        </h2>
      </div>
      <IconButton
        onClick={closeThreadSidebar}
        icon={X}
        variant="ghost"
        size="sm"
        aria-label={t('closeThread')}
        className="rounded-md transition-colors hover:bg-accent"
      />
    </div>
  );
});

export { ThreadHeader };
