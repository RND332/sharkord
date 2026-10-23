import { EmojiPicker } from '@/components/emoji-picker';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import type { TTiptapInputHandle } from '@/components/tiptap-input';
import { TiptapInput } from '@/components/tiptap-input';
import type { TEmojiItem } from '@/components/tiptap-input/helpers';

import type { MouseEvent as ReactMouseEvent } from 'react';

import { useChannelById } from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  usePublicServerSettings
} from '@/features/server/hooks';
import { useFlatPluginCommands } from '@/features/server/plugins/hooks';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type { TReplyTarget } from '@/types';
import type { TJoinedPublicUser, TTempFile } from '@dodecagon/shared';
import {
  ChannelPermission,
  isEmptyMessage,
  MESSAGE_MAX_LENGTH,
  Permission,
  PluginSlot
} from '@dodecagon/shared';
import { Button, Spinner } from '@dodecagon/ui';
import {
  ArrowUturnLeftIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { filesize } from 'filesize';
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useMessageAuthorName } from '../channel-view/text/hooks/use-message-author-name';
import { PreviewFile } from '../channel-view/text/preview-file';
import { UsersTypingIndicator } from '../channel-view/text/users-typing';

type TMessageComposeProps = {
  channelId: number;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (message: string, files: TTempFile[]) => Promise<boolean>;
  onTyping: () => void;
  typingUsers: TJoinedPublicUser[];
  showPluginSlot?: boolean;

  replyTarget?: TReplyTarget;
  onCancelReply?: () => void;
  onArrowUp?: () => void;
  onResize?: () => void;
  isThread?: boolean;
  dmPartnerName?: string;
  ref?: Ref<TMessageComposeHandle>;
};

type TMessageComposeHandle = {
  clearFiles: () => void;
  focus: () => void;
};

const MessageCompose = memo(
  ({
    channelId,
    message,
    onMessageChange,
    onSend,
    onTyping,
    typingUsers,
    showPluginSlot = false,

    replyTarget,
    onCancelReply,
    onArrowUp,
    onResize,
    isThread = false,
    dmPartnerName,
    ref
  }: TMessageComposeProps) => {
    const { t } = useTranslation('common');
    const sendingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const tiptapRef = useRef<TTiptapInputHandle>(null);
    const [sending, setSending] = useState(false);
    const can = useCan();
    const channelCan = useChannelCan(channelId);
    const channel = useChannelById(channelId);
    const publicSettings = usePublicServerSettings();
    const allPluginCommands = useFlatPluginCommands();
    const replyAuthorName = useMessageAuthorName({
      userId: replyTarget?.userId ?? 0,
      pluginId: replyTarget?.pluginId ?? ''
    });

    const canSendMessages = useMemo(() => {
      return (
        can(Permission.SEND_MESSAGES) &&
        channelCan(ChannelPermission.SEND_MESSAGES)
      );
    }, [can, channelCan]);

    const canUploadFiles = useMemo(() => {
      const canShareFilesInDm =
        !channel?.isDm || !!publicSettings?.storageFileSharingInDirectMessages;

      return (
        can(Permission.SEND_MESSAGES) &&
        can(Permission.UPLOAD_FILES) &&
        channelCan(ChannelPermission.SEND_MESSAGES) &&
        canShareFilesInDm
      );
    }, [can, channelCan, channel, publicSettings]);

    const placeholder = useMemo(() => {
      if (isThread) {
        return t('replyInThreadPlaceholder');
      }

      if (channel && !channel.isDm) {
        return t('messageChannel', { name: channel.name });
      }

      if (channel?.isDm && dmPartnerName) {
        return t('messageUser', { name: dmPartnerName });
      }

      return t('typeAMessage');
    }, [channel, dmPartnerName, isThread, t]);

    const pluginCommands = useMemo(
      () => (can(Permission.USE_PLUGINS) ? allPluginCommands : undefined),
      [can, allPluginCommands]
    );

    const {
      files,
      displayItems,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      uploadSpeed,
      openFileDialog,
      fileInputProps
    } = useUploadFiles(channelId, containerRef, !canSendMessages);

    useImperativeHandle(
      ref,
      () => ({ clearFiles, focus: () => tiptapRef.current?.focus() }),
      [clearFiles]
    );

    const handleSend = useCallback(async () => {
      if (
        (isEmptyMessage(message) && !files.length) ||
        !canSendMessages ||
        uploading ||
        sendingRef.current
      ) {
        return;
      }

      if (message.length > MESSAGE_MAX_LENGTH) {
        toast.error(t('messageTooLong', { max: MESSAGE_MAX_LENGTH }));

        return;
      }

      setSending(true);
      sendingRef.current = true;

      const success = await onSend(message, files);

      sendingRef.current = false;
      setSending(false);

      if (success) {
        clearFiles();
      }
    }, [message, files, canSendMessages, uploading, onSend, clearFiles, t]);

    const focusInputOnBackdropClick = useCallback(
      (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;

        tiptapRef.current?.focus();
      },
      []
    );

    const chatActionsProps = useMemo(() => ({ channelId }), [channelId]);

    const insertEmoji = useCallback((emoji: TEmojiItem) => {
      tiptapRef.current?.insertEmoji(emoji);
    }, []);

    const onRemoveFileClick = useCallback(
      async (fileId: string) => {
        removeFile(fileId);

        const trpc = getTRPCClient();

        await trpc.files.deleteTemporary.mutate({ fileId }).catch(() => {});
      },
      [removeFile]
    );

    useEffect(() => {
      // focus the input when user clicks on reply
      if (replyTarget) {
        tiptapRef.current?.focus();
      }
    }, [replyTarget]);

    // TODO: check if this is really necessary
    useEffect(() => {
      if (!onResize) return;

      const el = containerRef.current;

      if (!el) return;

      const observer = new ResizeObserver(onResize);

      observer.observe(el);

      return () => observer.disconnect();
    }, [onResize, containerRef]);

    return (
      <div
        ref={containerRef}
        className={cn(
          'compose-container relative flex max-h-[35vh] shrink-0 flex-col gap-2 bg-canvas',
          isThread
            ? 'pb-4 pl-[23px] pr-6 pt-2'
            : 'px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[10px]'
        )}
      >
        <UsersTypingIndicator typingUsers={typingUsers} />

        <div
          className={cn(
            'compose-scroll-row flex flex-1 cursor-text items-start gap-[14px] overflow-y-auto rounded-md bg-raised',
            isThread
              ? 'min-h-[44px] px-3 py-0 [&_.ProseMirror]:px-0! [&_.ProseMirror]:py-2.5! [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-5! [&_.tiptap+div]:px-0! [&_.tiptap+div]:py-2.5! [&_.tiptap+div]:text-sm [&_.tiptap+div]:leading-5 [&_.tiptap+div]:text-muted-foreground'
              : 'min-h-[52px] px-4 [&_.ProseMirror]:px-0! [&_.ProseMirror]:py-4! [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-5! [&_.tiptap+div]:px-0! [&_.tiptap+div]:py-4! [&_.tiptap+div]:text-sm [&_.tiptap+div]:leading-5 [&_.tiptap+div]:text-muted-foreground',
            uploading && 'bg-muted'
          )}
          onClick={focusInputOnBackdropClick}
        >
          <Button
            size="icon"
            variant="ghost"
            className="mt-2.5 size-8 shrink-0 p-1.5 sticky top-2.5"
            aria-label={t('attachFiles')}
            disabled={uploading || !canUploadFiles}
            onClick={openFileDialog}
          >
            <PlusIcon className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col">
            {replyTarget && (
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 mx-2 mt-3 px-2 py-1 text-xs">
                <div className="min-w-0 flex items-center gap-1.5 text-muted-foreground">
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('replyingTo', { username: replyAuthorName })}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 shrink-0 p-[5px]"
                  onClick={onCancelReply}
                  title={t('cancelReply')}
                >
                  <XMarkIcon className="size-3.5" />
                </Button>
              </div>
            )}
            {uploading && (
              <div className="flex items-center gap-2 px-2 pt-2">
                <div className="text-xs text-muted-foreground mb-1">
                  Uploading files ({filesize(uploadingSize)})
                  {uploadSpeed > 0 && ` - ${filesize(uploadSpeed)}/s`}
                </div>
                <Spinner size="xxs" />
              </div>
            )}
            {displayItems.length > 0 && (
              <div className="flex gap-1 flex-wrap px-4 pt-4">
                {displayItems.map((item) => (
                  <PreviewFile
                    key={item.id}
                    item={item}
                    onRemove={
                      item.file
                        ? () => onRemoveFileClick(item.file!.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            <TiptapInput
              ref={tiptapRef}
              value={message}
              placeholder={placeholder}
              onChange={onMessageChange}
              onSubmit={handleSend}
              onTyping={onTyping}
              onArrowUp={onArrowUp}
              disabled={!canSendMessages}
              readOnly={sending}
              commands={pluginCommands}
            />
          </div>

          <input {...fileInputProps} />
          <div className="flex items-start gap-2 pt-2.5 shrink-0 sticky top-0">
            {showPluginSlot && (
              <PluginSlotRenderer
                slotId={PluginSlot.CHAT_ACTIONS}
                props={chatActionsProps}
              />
            )}

            <EmojiPicker onEmojiSelect={insertEmoji}>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 p-1.5"
                aria-label={t('addEmoji')}
                disabled={!canSendMessages}
              >
                <FaceSmileIcon className="size-5" />
              </Button>
            </EmojiPicker>
            {(!isEmptyMessage(message) || displayItems.length > 0) && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 p-2"
                aria-label={t('sendMessage')}
                onClick={handleSend}
                disabled={uploading || sending || !canSendMessages}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { MessageCompose, type TMessageComposeHandle };
