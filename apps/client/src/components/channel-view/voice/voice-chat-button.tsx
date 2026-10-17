import { UnreadCount } from '@/components/unread-count';
import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { Button, Tooltip } from '@sharkord/ui';
import { MessageSquare } from 'lucide-react';
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

  const label = isVoiceChatOpen ? t('closeVoiceChat') : t('openVoiceChat');

  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleVoiceChat}
        aria-label={label}
        className={cn(
          'relative size-8 rounded-md border border-line bg-nav/85 p-0 backdrop-blur hover:bg-nav',
          isVoiceChatOpen && 'text-foreground'
        )}
      >
        <MessageSquare
          className={cn('size-[18px]', isVoiceChatOpen && 'fill-current')}
        />
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
