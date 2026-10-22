import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useOwnUserPasswordSet } from '@/features/server/users/hooks';
import { cleanup, getTRPCClient } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle, Input } from '@dodecagon/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TPasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

// Paper · Password: two fields share a row, the confirmation sits below them
const FIELD_CLASS = 'flex w-full max-w-[510px] basis-[510px] flex-col gap-2';
const FIELD_LABEL_CLASS = 'text-[13px] leading-4 text-foreground';
const FIELD_INPUT_CLASS = 'px-[15px] placeholder:text-muted-foreground';

const Password = memo(() => {
  const { t } = useTranslation('settings');
  const canChangePassword = useOwnUserPasswordSet();

  const onSave = useCallback(async (values: TPasswordValues) => {
    const trpc = getTRPCClient();

    await trpc.users.updatePassword.mutate(values);
    cleanup();
  }, []);

  const { r } = useSettingsForm<TPasswordValues>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    },
    onSave,
    successMessage: t('passwordUpdated'),
    errorMessage: t('failedUpdatePassword')
  });

  return (
    <SettingsSection title={t('passwordTitle')} description={t('passwordDesc')}>
      {!canChangePassword && (
        <Alert variant="info">
          <AlertTitle>{t('passwordManagedBySsoTitle')}</AlertTitle>
          <AlertDescription>{t('passwordManagedBySsoDesc')}</AlertDescription>
        </Alert>
      )}

      <div className="flex max-w-[1040px] flex-col gap-[22px]">
        <div className="flex flex-wrap gap-5">
          <label className={FIELD_CLASS}>
            <span className={FIELD_LABEL_CLASS}>
              {t('currentPasswordLabel')}
            </span>
            <Input
              {...r('currentPassword', 'password')}
              placeholder={t('currentPasswordPlaceholder')}
              disabled={!canChangePassword}
              className={FIELD_INPUT_CLASS}
            />
          </label>

          <label className={FIELD_CLASS}>
            <span className={FIELD_LABEL_CLASS}>{t('newPasswordLabel')}</span>
            <Input
              {...r('newPassword', 'password')}
              placeholder={t('newPasswordPlaceholder')}
              disabled={!canChangePassword}
              className={FIELD_INPUT_CLASS}
            />
          </label>
        </div>

        <label className={FIELD_CLASS}>
          <span className={FIELD_LABEL_CLASS}>
            {t('confirmNewPasswordLabel')}
          </span>
          <Input
            {...r('confirmNewPassword', 'password')}
            placeholder={t('confirmPasswordPlaceholder')}
            disabled={!canChangePassword}
            className={FIELD_INPUT_CLASS}
          />
        </label>

        <p className="text-[13px] leading-4 text-subtle-foreground">
          {t('passwordMatchHint')}
        </p>
      </div>
    </SettingsSection>
  );
});

export { Password };
