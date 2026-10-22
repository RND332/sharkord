import { LanguageSwitcher } from '@/components/language-switcher';
import { SettingsRow } from '@/components/server-screens/settings-shell/row';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { setAutoJoinLastChannel } from '@/features/app/actions';
import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { Switch } from '@dodecagon/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Themes } from './themes';

type TOthersValues = {
  autoJoinLastChannel: boolean;
};

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();

  const onSave = useCallback(async (values: TOthersValues) => {
    setAutoJoinLastChannel(values.autoJoinLastChannel);
  }, []);

  const { values, onChange } = useSettingsForm<TOthersValues>({
    initialValues: { autoJoinLastChannel },
    onSave,
    successMessage: t('othersUpdated'),
    errorMessage: t('failedUpdateOthers')
  });

  const handleAutoJoinChange = useCallback(
    (value: boolean) => onChange('autoJoinLastChannel', value),
    [onChange]
  );

  return (
    <SettingsSection title={t('othersTitle')} description={t('othersDesc')}>
      <Themes />

      <div className="flex max-w-[1040px] flex-col">
        <SettingsRow
          label={t('autoJoinLastChannelLabel')}
          description={t('autoJoinLastChannelDesc')}
        >
          <Switch
            aria-label={t('autoJoinLastChannelLabel')}
            checked={values.autoJoinLastChannel}
            onCheckedChange={handleAutoJoinChange}
          />
        </SettingsRow>

        <SettingsRow
          label={t('languageLabel')}
          description={t('languageDesc')}
          className="border-b-0"
        >
          <LanguageSwitcher />
        </SettingsRow>
      </div>
    </SettingsSection>
  );
});

export { Others };
