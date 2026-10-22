import { PluginAvatar } from '@/components/plugin-avatar';
import { useThreadSidebar } from '@/features/app/hooks';
import { useParentMessage } from '@/features/server/messages/hooks';
import { usePluginMetadata } from '@/features/server/plugins/hooks';
import type { TJoinedMessage } from '@dodecagon/shared';
import { Spinner } from '@dodecagon/ui';
import { format, isValid } from 'date-fns';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessageAuthorName } from '../channel-view/text/hooks/use-message-author-name';
import { MessageRenderer } from '../channel-view/text/renderer';
import { UserAvatar } from '../user-avatar';

type TParentMessageContentProps = {
  parentMessage: TJoinedMessage;
};

const ParentMessageContent = memo(
  ({ parentMessage }: TParentMessageContentProps) => {
    const { t } = useTranslation('common');
    const pluginMetadata = usePluginMetadata(parentMessage.pluginId);
    const isPluginMessage = !!parentMessage.pluginId;
    const authorName = useMessageAuthorName(parentMessage);
    const date = new Date(parentMessage.createdAt);
    const hasValidDate = isValid(date);

    return (
      <div
        data-thread-parent
        className="max-h-64 shrink-0 overflow-auto border-b border-border px-6 pb-4 pt-[22px]"
      >
        <div className="flex items-center gap-2">
          {isPluginMessage ? (
            <PluginAvatar
              name={pluginMetadata?.name}
              avatarUrl={pluginMetadata?.avatarUrl}
              className="size-7"
            />
          ) : (
            <UserAvatar
              userId={parentMessage.userId}
              className="size-7"
              showUserPopover
            />
          )}
          <span className="text-sm font-semibold">{authorName}</span>
          {hasValidDate ? (
            <time
              className="text-xs leading-4 text-subtle-foreground"
              dateTime={date.toISOString()}
              title={format(date, 'PPpp')}
            >
              {format(date, 'h:mm a')}
            </time>
          ) : (
            <span className="text-xs leading-4 text-subtle-foreground">
              {t('unknownTime')}
            </span>
          )}
        </div>
        <div className="mt-2 text-[14px] leading-[22px] opacity-90 [&_.msg-content]:text-[14px]! [&_.msg-content]:leading-[22px]!">
          <MessageRenderer message={parentMessage} />
        </div>
      </div>
    );
  }
);

type TParentMessagePreviewProps = {
  messageId: number;
};

const ParentMessagePreview = memo(
  ({ messageId }: TParentMessagePreviewProps) => {
    const { t } = useTranslation('common');
    const { channelId } = useThreadSidebar();
    const parentMessage = useParentMessage(messageId, channelId);

    if (!parentMessage) {
      return (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-3">
          <Spinner size="xs" />
          <span className="text-sm text-muted-foreground">
            {t('loadingMessage')}
          </span>
        </div>
      );
    }

    return <ParentMessageContent parentMessage={parentMessage} />;
  }
);

export { ParentMessagePreview };
