import { SettingsRow } from '@/components/server-screens/settings-shell/row';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminChannelGeneral } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Input, LoadingCard, Switch, Textarea } from '@sharkord/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type TGeneralProps = {
  channelId: number;
};

type TChannelValues = {
  name: string;
  topic: string;
  private: boolean;
};

const General = memo(({ channelId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { channel, loading } = useAdminChannelGeneral(channelId);

  const onSave = useCallback(
    async (values: TChannelValues) => {
      const trpc = getTRPCClient();

      await trpc.channels.update.mutate({
        channelId,
        name: values.name,
        topic: values.topic || null,
        private: values.private
      });
    },
    [channelId]
  );

  const { r, values, onChange, reset } = useSettingsForm<TChannelValues>({
    initialValues: { name: '', topic: '', private: false },
    onSave,
    successMessage: t('channelUpdated'),
    errorMessage: t('failedUpdateChannel')
  });

  useEffect(() => {
    if (!channel) return;

    reset({
      name: channel.name,
      topic: channel.topic ?? '',
      private: channel.private
    });
  }, [channel, reset]);

  const handlePrivateChange = useCallback(
    (value: boolean) => onChange('private', value),
    [onChange]
  );

  if (loading) {
    return <LoadingCard className="h-64" />;
  }

  const displayName = values.name || channel?.name || '';
  const title =
    channel?.type === 'TEXT'
      ? `#${displayName}`
      : displayName || t('channelInfoTitle');

  return (
    <SettingsSection title={title} description={t('channelInfoDesc')}>
      <div className="flex w-full max-w-[900px] flex-col gap-[22px]">
        <div className="flex w-full max-w-[880px] flex-col gap-4">
          <div className="flex flex-col gap-[7px]">
            <label
              className="text-sm font-semibold leading-[18px] text-foreground"
              htmlFor="channel-name"
            >
              {t('channelNameLabel')}
            </label>
            <Input
              id="channel-name"
              placeholder={t('channelNamePlaceholder')}
              className="h-[44px] max-w-[550px] rounded-[8px] border-control-border px-[13px] text-sm"
              {...r('name')}
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <label
              className="text-sm font-semibold leading-[18px] text-foreground"
              htmlFor="channel-topic"
            >
              {t('channelTopicLabel')}
            </label>
            <Textarea
              id="channel-topic"
              rows={2}
              placeholder={t('channelTopicPlaceholder')}
              className="min-h-[62px] max-w-[550px] rounded-[8px] border-control-border px-[13px] py-[13px] text-sm"
              {...r('topic')}
            />
          </div>
        </div>

        <div className="w-full max-w-[650px]">
          <SettingsRow
            label={t('privateLabel')}
            description={t('privateDesc')}
            className="border-b-0"
          >
            <Switch
              aria-label={t('privateLabel')}
              checked={values.private}
              onCheckedChange={handlePrivateChange}
            />
          </SettingsRow>
        </div>
      </div>
    </SettingsSection>
  );
});

export { General };
