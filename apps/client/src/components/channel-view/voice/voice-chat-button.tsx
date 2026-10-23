import { UnreadCount } from '@/components/unread-count';
import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { Button, Tooltip } from '@dodecagon/ui';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TVoiceChatButtonProps = {
  channelId: number;
};

const VoiceChatButton = memo(({ channelId }: TVoiceChatButtonProps) => {
  const { t } = useTranslation('topbar');
  const { isOpen, channelId: openVoiceChatChannelId } = useVoiceChatSidebar();

  const isVoiceChatOpen = isOpen && openVoiceChatChannelId === channelId;
  const unreadCount = useUnreadMessagesCount(channelId);
  const hasUnreadMentions = useHasUnreadMentions(channelId);

  const handleToggleVoiceChat = useCallback(() => {
    toggleVoiceChatSidebar(channelId);
  }, [channelId]);

  // the chat of this channel is open, the panel closes it on its own
  if (isVoiceChatOpen) {
    return null;
  }

  const label = t('openVoiceChat');

  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleVoiceChat}
        aria-label={label}
        className="relative size-8 rounded-md border border-line bg-nav/85 p-0 backdrop-blur hover:bg-nav"
      >
        <ChatBubbleLeftIcon className="size-[18px]" />
        <UnreadCount
          count={unreadCount}
          hasMention={hasUnreadMentions}
          className="absolute -right-1.5 -top-1.5 ml-0 h-4 min-w-4 px-1 text-[10px] leading-none"
        />
      </Button>
    </Tooltip>
  );
});

export { VoiceChatButton };
