import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useOwnUserPasswordSet } from '@/features/server/users/hooks';
import { cleanup, getTRPCClient } from '@/lib/trpc';
import { Alert, AlertDescription, AlertTitle, Input } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TPasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

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

      <div className="flex max-w-[1040px] flex-wrap gap-5">
        <label className="flex w-full max-w-[510px] flex-col gap-2">
          <span className="text-sm leading-4 text-foreground">
            {t('currentPasswordLabel')}
          </span>
          <Input
            {...r('currentPassword', 'password')}
            placeholder={t('currentPasswordPlaceholder')}
            disabled={!canChangePassword}
          />
        </label>

        <label className="flex w-full max-w-[510px] flex-col gap-2">
          <span className="text-sm leading-4 text-foreground">
            {t('newPasswordLabel')}
          </span>
          <Input
            {...r('newPassword', 'password')}
            placeholder={t('newPasswordPlaceholder')}
            disabled={!canChangePassword}
          />
        </label>

        <label className="flex w-full max-w-[510px] flex-col gap-2">
          <span className="text-sm leading-4 text-foreground">
            {t('confirmNewPasswordLabel')}
          </span>
          <Input
            {...r('confirmNewPassword', 'password')}
            placeholder={t('confirmPasswordPlaceholder')}
            disabled={!canChangePassword}
          />
        </label>
      </div>

      <p className="text-sm leading-4 text-subtle-foreground">
        {t('passwordMatchHint')}
      </p>
    </SettingsSection>
  );
});

export { Password };
