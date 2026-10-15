import { MessageCompose } from '@/components/message-compose';
import { useThreadSidebar } from '@/features/app/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { SoundType } from '@/features/server/types';
import { playSound } from '@/helpers/sounds';

import { useTypingSignal } from '@/hooks/use-typing-signal';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import {
  ChannelPermission,
  getTrpcError,
  prepareMessageHtml,
  TestId,
  type TJoinedMessage
} from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { format, isSameDay, isToday } from 'date-fns';
import { ArrowDown, Hash } from 'lucide-react';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useArrowUpEdit } from './hooks/use-arrow-up-edit';
import { useScrollController } from './hooks/use-scroll-controller';
import { useScrollToJumpTarget } from './hooks/use-scroll-to-jump-target';
import { MessagesGroup } from './messages-group';
import { TextNoAccess } from './text-no-access';
import { TextSkeleton } from './text-skeleton';
import { TextTopbar } from './text-top-bar';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';

type TChannelProps = {
  channelId: number;
  onClose?: () => void;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
};

const TextChannel = memo((props: TChannelProps) => {
  const { channelId, onClose, onToggleRightSidebar, isRightSidebarOpen } =
    props;
  const { t } = useTranslation();
  const channel = useChannelById(channelId);
  const {
    messages,
    hasMore,
    loadMore,
    loading,
    fetching,
    groupedMessages,
    scrollToMessage,
    detachedFromPresent,
    returnToPresent
  } = useMessages(channelId);

  useScrollToJumpTarget(channelId, scrollToMessage);

  const draftChannelKey = getChannelDraftKey(channelId);

  const [newMessage, setNewMessage] = useState(
    getDraftMessage(draftChannelKey)
  );
  const [replyingToMessage, setReplyingToMessage] = useState<
    TJoinedMessage | undefined
  >();
  const typingUsers = useTypingUsersByChannelId(channelId);

  const { activeThreadMessageId } = useThreadSidebar();
  const {
    composeRef,
    editingMessageId,
    handleArrowUpEdit,
    handleEditComplete
  } = useArrowUpEdit(messages);

  const replyTarget = useMemo<TReplyTarget | undefined>(() => {
    if (!replyingToMessage) {
      return undefined;
    }

    if (replyingToMessage.pluginId) {
      return { userId: null, pluginId: replyingToMessage.pluginId };
    }

    return { userId: replyingToMessage.userId, pluginId: null };
  }, [replyingToMessage]);

  const {
    containerRef,
    onScroll,
    onAsyncContentLoaded,
    scrollToBottom,
    isAtBottom
  } = useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore,
    hasTypingUsers: typingUsers.length > 0
  });

  const onComposeResize = useCallback(() => {
    if (isAtBottom()) {
      scrollToBottom();
    }
  }, [isAtBottom, scrollToBottom]);

  const channelCan = useChannelCan(channelId);

  const sendTypingSignal = useTypingSignal(channelId);

  const setNewMessageHandler = useCallback(
    (value: string) => {
      setNewMessage(value);
      setDraftMessage(draftChannelKey, value);
    },
    [setNewMessage, draftChannelKey]
  );

  const onSend = useCallback(
    async (message: string, files: { id: string }[]) => {
      sendTypingSignal.cancel();

      const trpc = getTRPCClient();

      try {
        await trpc.messages.send.mutate({
          content: prepareMessageHtml(message),
          channelId,
          files: files.map((f) => f.id),
          replyToMessageId: replyingToMessage?.id
        });

        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSendMessage')));
        return false;
      }

      setNewMessageHandler('');
      setReplyingToMessage(undefined);

      return true;
    },
    [
      channelId,
      sendTypingSignal,
      setNewMessageHandler,
      t,
      replyingToMessage?.id
    ]
  );

  const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
    setReplyingToMessage(message);
  }, []);

  const handleReturnToPresent = useCallback(() => {
    returnToPresent();
  }, [returnToPresent]);

  const handleCancelReply = useCallback(
    () => setReplyingToMessage(undefined),
    [setReplyingToMessage]
  );

  if (!channelCan(ChannelPermission.VIEW_CHANNEL)) {
    return <TextNoAccess />;
  }

  if (loading) {
    return <TextSkeleton />;
  }

  return (
    <>
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
            <Spinner size="xs" />
            <span className="text-sm text-muted-foreground">
              Fetching older messages...
            </span>
          </div>
        </div>
      )}

      <TextTopbar
        onScrollToMessage={scrollToMessage}
        channelId={channelId}
        onClose={onClose}
        onToggleRightSidebar={onToggleRightSidebar}
        isRightSidebarOpen={isRightSidebarOpen}
      />

      <div
        ref={containerRef}
        onScroll={onScroll}
        onLoadCapture={onAsyncContentLoaded}
        data-messages-container
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-2"
      >
        <div className="flex min-h-full flex-col justify-end [&>*]:shrink-0">
          {!hasMore && !detachedFromPresent && channel && !channel.isDm && (
            <div
              data-channel-welcome
              className="flex flex-col gap-[7px] pb-[22px]"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#3d414b]">
                <Hash className="size-6" />
              </div>
              <h2 className="text-[27px] leading-[33px] font-bold tracking-[-0.02em]">
                {t('welcomeToChannel', { name: channel.name })}
              </h2>
              <p className="text-[15px] leading-[23px]">
                {t('channelWelcomeDesc')}
              </p>
            </div>
          )}
          {groupedMessages.map((group, index) => (
            <Fragment key={group.key}>
              {(index === 0 ||
                !isSameDay(
                  new Date(group.messages[0].createdAt),
                  new Date(groupedMessages[index - 1].messages[0].createdAt)
                )) && (
                <div
                  data-message-date
                  className="flex h-9 items-center gap-[14px]"
                >
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-xs leading-4 font-semibold uppercase text-[#a7abb2]">
                    {isToday(new Date(group.messages[0].createdAt))
                      ? t('today')
                      : format(new Date(group.messages[0].createdAt), 'PPP')}
                  </span>
                  <div className="h-px flex-1 bg-line" />
                </div>
              )}
              <MessagesGroup
                showClockTime
                group={group.messages}
                onReplyMessageSelect={onReplyMessageSelect}
                replyTargetMessageId={replyingToMessage?.id}
                activeThreadMessageId={activeThreadMessageId}
                editingMessageId={editingMessageId}
                onEditComplete={handleEditComplete}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {detachedFromPresent && (
        <button
          type="button"
          onClick={handleReturnToPresent}
          data-testid={TestId.RETURN_TO_PRESENT}
          className="mx-2 mb-1 flex items-center justify-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 cursor-pointer"
        >
          <ArrowDown className="size-3.5" />
          {t('viewingOlderMessages')}
        </button>
      )}

      <MessageCompose
        ref={composeRef}

        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessageHandler}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
        showPluginSlot
        onCancelReply={handleCancelReply}
        replyTarget={replyTarget}
        onArrowUp={handleArrowUpEdit}
        onResize={onComposeResize}
      />
    </>
  );
});

export { TextChannel };
