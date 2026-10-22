import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { StatePanel } from '@/components/server-screens/settings-shell/state-panel';
import { useAdminEmojis } from '@/features/server/admin/hooks';
import { uploadFiles } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { Button, LoadingCard, Spinner, Tooltip } from '@dodecagon/ui';
import { ArrowUpTrayIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmojiList } from './emoji-list';
import { UpdateEmoji } from './update-emoji';

const Emojis = memo(() => {
  const { t } = useTranslation('settings');
  const { emojis, refetch, loading } = useAdminEmojis();
  const openFilePicker = useFilePicker();

  const [selectedEmojiId, setSelectedEmojiId] = useState<number | undefined>(
    undefined
  );
  const [isUploading, setIsUploading] = useState(false);

  const uploadEmoji = useCallback(async () => {
    const files = await openFilePicker('image/*', true);

    if (!files || files.length === 0) return;

    setIsUploading(true);

    const trpc = getTRPCClient();

    try {
      const temporaryFiles = await uploadFiles(files);

      await trpc.emojis.add.mutate(
        temporaryFiles.map((f) => ({
          name: f.originalName.replace(/\.[^/.]+$/, '').slice(0, 32),
          fileId: f.id
        }))
      );

      refetch();
      toast.success(t('emojiCreated'));
    } catch (error) {
      console.error('Error uploading emoji:', error);
      toast.error(t('failedUploadEmoji'));
    } finally {
      setIsUploading(false);
    }
  }, [openFilePicker, refetch, t]);

  const selectedEmoji = useMemo(
    () => emojis.find((emoji) => emoji.id === selectedEmojiId),
    [emojis, selectedEmojiId]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  let uploadAction = (
    <Tooltip content={t('uploadEmojiBtn')}>
      <button
        type="button"
        onClick={uploadEmoji}
        aria-label={t('uploadEmojiBtn')}
        className="flex size-[38px] items-center justify-center rounded-[7px] bg-raised text-foreground transition-colors hover:bg-panel focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowUpTrayIcon className="size-6" strokeWidth={1.5} />
      </button>
    </Tooltip>
  );

  if (isUploading) {
    uploadAction = <Spinner size="xxs" />;
  }

  return (
    <SettingsSection
      title={t('emojiTitle')}
      description={t('emojiDesc')}
      action={uploadAction}
    >
      <div className="flex w-full flex-col gap-6">
        {selectedEmoji && (
          <div className="max-w-[600px]">
            <UpdateEmoji
              key={selectedEmoji.id}
              selectedEmoji={selectedEmoji}
              setSelectedEmojiId={setSelectedEmojiId}
              refetch={refetch}
            />
          </div>
        )}

        {emojis.length === 0 ? (
          <StatePanel
            icon={FaceSmileIcon}
            title={t('uploadEmojiTitle')}
            description={t('uploadEmojiDesc')}
            action={
              <Button onClick={uploadEmoji} disabled={isUploading}>
                {isUploading ? (
                  <Spinner size="xxs" />
                ) : (
                  <ArrowUpTrayIcon className="h-4 w-4" />
                )}
                {t('uploadEmojiBtn')}
              </Button>
            }
          />
        ) : (
          <EmojiList
            emojis={emojis}
            setSelectedEmojiId={setSelectedEmojiId}
            selectedEmojiId={selectedEmojiId}
          />
        )}
      </div>
    </SettingsSection>
  );
});

export { Emojis };
