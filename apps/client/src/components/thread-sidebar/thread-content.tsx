import { useThreadSidebar } from '@/features/app/hooks';
import { useTypingUsersByThreadId } from '@/features/server/hooks';
import {
  useParentMessage,
  useThreadMessages
} from '@/features/server/messages/hooks';

import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import type { TJoinedMessage } from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useArrowUpEdit } from '../channel-view/text/hooks/use-arrow-up-edit';
import { useScrollController } from '../channel-view/text/hooks/use-scroll-controller';
import { MessagesGroup } from '../channel-view/text/messages-group';
import { ParentMessagePreview } from './parent-message-preview';
import { ThreadCompose } from './thread-compose';
import { ThreadHeader } from './thread-header';

type TThreadContentProps = {
  parentMessageId: number;
  channelId: number;
};

const ThreadContent = memo(
  ({ parentMessageId, channelId }: TThreadContentProps) => {
    const { t } = useTranslation('common');
    const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
      useThreadMessages(parentMessageId);
    const [replyingToMessage, setReplyingToMessage] = useState<
      TJoinedMessage | undefined
    >();
    const { activeThreadMessageId } = useThreadSidebar();
    const parentMessage = useParentMessage(parentMessageId, channelId);
    const replyCount = parentMessage?.replyCount ?? 0;
    const {
      composeRef,
      editingMessageId,
      handleArrowUpEdit,
      handleEditComplete
    } = useArrowUpEdit(messages);

    const typingUsers = useTypingUsersByThreadId(parentMessageId);

    const {
      bindContainer,
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

    const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
      setReplyingToMessage(message);
    }, []);

    const handleCancelReply = useCallback(
      () => setReplyingToMessage(undefined),

      [setReplyingToMessage]
    );

    return (
      <div className="flex flex-col h-full w-full">
        <ThreadHeader channelId={channelId} />
        <ParentMessagePreview messageId={parentMessageId} />

        {replyCount > 0 && (
          <div
            data-thread-reply-count
            className="flex shrink-0 items-center gap-3 px-6 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground"
          >
            <span>{t('reply', { count: replyCount })}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              {fetching && (
                <div className="h-8 flex items-center justify-center shrink-0">
                  <Spinner size="xs" />
                </div>
              )}

              <div
                ref={bindContainer}
                onScroll={onScroll}
                onLoadCapture={onAsyncContentLoaded}
                data-thread-messages
                className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-3 animate-in fade-in duration-500"
              >
                {messages.length === 0 && !fetching ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 mb-2 opacity-50" />
                    <p>{t('noRepliesYet')}</p>
                    <p className="text-xs">{t('beFirstToReply')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedMessages.map((group) => (
                      <MessagesGroup
                        key={group.key}
                        group={group.messages}
                        compact
                        showClockTime
                        onReplyMessageSelect={onReplyMessageSelect}
                        replyTargetMessageId={replyingToMessage?.id}
                        activeThreadMessageId={activeThreadMessageId}
                        editingMessageId={editingMessageId}
                        onEditComplete={handleEditComplete}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <ThreadCompose
            ref={composeRef}
            parentMessageId={parentMessageId}
            channelId={channelId}
            typingUsers={typingUsers}
            replyingToMessage={replyingToMessage}
            onCancelReply={handleCancelReply}
            onArrowUp={handleArrowUpEdit}

            onResize={onComposeResize}
          />
        </div>
      </div>
    );
  }
);

export { ThreadContent };
