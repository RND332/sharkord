import { SettingsRow } from '@/components/server-screens/settings-shell/row';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import {
  setBrowserNotifications,
  setBrowserNotificationsForDms,
  setBrowserNotificationsForMentions,
  setBrowserNotificationsForReplies,
  setMessageSentSound,
  setNotificationSounds
} from '@/features/app/actions';
import {
  useBrowserNotifications,
  useBrowserNotificationsForDms,
  useBrowserNotificationsForMentions,
  useBrowserNotificationsForReplies,
  useMessageSentSound,
  useNotificationSounds
} from '@/features/app/hooks';
import { Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TNotificationsValues = {
  all: boolean;
  mentions: boolean;
  dms: boolean;
  replies: boolean;
  sounds: boolean;
  sentSound: boolean;
};

const Notifications = memo(() => {
  const { t } = useTranslation('settings');
  const all = useBrowserNotifications();
  const mentions = useBrowserNotificationsForMentions();
  const dms = useBrowserNotificationsForDms();
  const replies = useBrowserNotificationsForReplies();
  const sounds = useNotificationSounds();
  const sentSound = useMessageSentSound();

  const onSave = useCallback(async (values: TNotificationsValues) => {
    // TODO: refactor this later
    setBrowserNotifications(values.all);
    setBrowserNotificationsForMentions(values.mentions);
    setBrowserNotificationsForDms(values.dms);
    setBrowserNotificationsForReplies(values.replies);
    setNotificationSounds(values.sounds);
    setMessageSentSound(values.sentSound);
  }, []);

  const { values, onChange } = useSettingsForm<TNotificationsValues>({
    initialValues: { all, mentions, dms, replies, sounds, sentSound },
    onSave,
    successMessage: t('notificationsUpdated'),
    errorMessage: t('failedUpdateNotifications')
  });

  const handleAllChange = useCallback(
    (value: boolean) => onChange('all', value),
    [onChange]
  );
  const handleMentionsChange = useCallback(
    (value: boolean) => onChange('mentions', value),
    [onChange]
  );
  const handleDmsChange = useCallback(
    (value: boolean) => onChange('dms', value),
    [onChange]
  );
  const handleRepliesChange = useCallback(
    (value: boolean) => onChange('replies', value),
    [onChange]
  );
  const handleSoundsChange = useCallback(
    (value: boolean) => onChange('sounds', value),
    [onChange]
  );
  const handleSentSoundChange = useCallback(
    (value: boolean) => onChange('sentSound', value),
    [onChange]
  );

  return (
    <SettingsSection
      title={t('notificationsTitle')}
      description={t('notificationsDesc')}
    >
      <div className="flex max-w-[1040px] flex-col">
        <SettingsRow
          label={t('allMessagesLabel')}
          description={t('allMessagesDesc')}
        >
          <Switch
            aria-label={t('allMessagesLabel')}
            checked={values.all}
            onCheckedChange={handleAllChange}
          />
        </SettingsRow>
        <SettingsRow
          label={t('mentionsOnlyLabel')}
          description={t('mentionsOnlyDesc')}
        >
          <Switch
            aria-label={t('mentionsOnlyLabel')}
            checked={values.mentions}
            onCheckedChange={handleMentionsChange}
          />
        </SettingsRow>
        <SettingsRow
          label={t('dmNotificationsLabel')}
          description={t('dmNotificationsDesc')}
        >
          <Switch
            aria-label={t('dmNotificationsLabel')}
            checked={values.dms}
            onCheckedChange={handleDmsChange}
          />
        </SettingsRow>
        <SettingsRow
          label={t('repliesNotificationsLabel')}
          description={t('repliesNotificationsDesc')}
        >
          <Switch
            aria-label={t('repliesNotificationsLabel')}
            checked={values.replies}
            onCheckedChange={handleRepliesChange}
          />
        </SettingsRow>
        <SettingsRow label={t('soundsLabel')} description={t('soundsDesc')}>
          <Switch
            aria-label={t('soundsLabel')}
            checked={values.sounds}
            onCheckedChange={handleSoundsChange}
          />
        </SettingsRow>
        <SettingsRow
          label={t('messageSentSoundLabel')}
          description={t('messageSentSoundDesc')}
          className="border-b-0"
        >
          <Switch
            aria-label={t('messageSentSoundLabel')}
            checked={values.sentSound}
            disabled={!values.sounds}
            onCheckedChange={handleSentSoundChange}
          />
        </SettingsRow>
      </div>
    </SettingsSection>
  );
});

export { Notifications };
