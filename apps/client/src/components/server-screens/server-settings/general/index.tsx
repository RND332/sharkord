import { SettingsRow } from '@/components/server-screens/settings-shell/row';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { usePickImage, type TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Input, LoadingCard, Switch, Textarea } from '@dodecagon/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GENERAL_FEATURES,
  type TGeneralFeature,
  type TGeneralFeatureKey
} from './helpers';

type TServerGeneralValues = {
  name: string;
  description: string;
  password: string;
  onlyAskForPasswordOnFirstJoin: boolean;
  allowNewUsers: boolean;
  directMessagesEnabled: boolean;
  enablePlugins: boolean;
  webRtcSimulcastEnabled: boolean;
  enableSearch: boolean;
  showWelcomeDialog: boolean;
  // undefined means untouched, null means remove
  logo?: TPickedImage | null;
};

const INITIAL_VALUES: TServerGeneralValues = {
  name: '',
  description: '',
  password: '',
  onlyAskForPasswordOnFirstJoin: false,
  allowNewUsers: false,
  directMessagesEnabled: true,
  enablePlugins: false,
  webRtcSimulcastEnabled: false,
  enableSearch: true,
  showWelcomeDialog: true
};

type TFeatureToggleProps = {
  feature: TGeneralFeature;
  checked: boolean;
  onChange: (key: TGeneralFeatureKey, checked: boolean) => void;
};

const FeatureToggle = memo(
  ({ feature, checked, onChange }: TFeatureToggleProps) => {
    const { t } = useTranslation('settings');
    const handleChange = useCallback(
      (next: boolean) => onChange(feature.key, next),
      [feature.key, onChange]
    );

    return (
      <SettingsRow
        label={t(feature.labelKey)}
        description={
          feature.descriptionKey ? t(feature.descriptionKey) : undefined
        }
        className={cn(
          'py-[13px]',
          feature.key === 'webRtcSimulcastEnabled' && 'border-b-0'
        )}
      >
        <Switch
          aria-label={t(feature.labelKey)}
          checked={checked}
          onCheckedChange={handleChange}
        />
      </SettingsRow>
    );
  }
);

FeatureToggle.displayName = 'FeatureToggle';

const General = memo(() => {
  const { t } = useTranslation('settings');
  const { settings, loading } = useAdminGeneral();
  const pickImage = usePickImage();

  const onSave = useCallback(async (values: TServerGeneralValues) => {
    const trpc = getTRPCClient();

    await trpc.others.updateSettings.mutate({
      name: values.name,
      description: values.description,
      password: values.password || null,
      onlyAskForPasswordOnFirstJoin: values.onlyAskForPasswordOnFirstJoin,
      allowNewUsers: values.allowNewUsers,
      directMessagesEnabled: values.directMessagesEnabled,
      enablePlugins: values.enablePlugins,
      webRtcSimulcastEnabled: values.webRtcSimulcastEnabled,
      enableSearch: values.enableSearch,
      showWelcomeDialog: values.showWelcomeDialog
    });

    if (values.logo !== undefined) {
      await trpc.others.changeLogo.mutate({ fileId: values.logo?.fileId });
    }
  }, []);

  const { r, values, onChange, reset } = useSettingsForm<TServerGeneralValues>({
    initialValues: INITIAL_VALUES,
    onSave,
    successMessage: t('settingsUpdated'),
    errorMessage: t('failedUpdateSettings')
  });

  useEffect(() => {
    if (!settings) return;

    reset({
      name: settings.name,
      description: settings.description ?? '',
      password: settings.password ?? '',
      onlyAskForPasswordOnFirstJoin:
        settings.onlyAskForPasswordOnFirstJoin ?? false,
      allowNewUsers: settings.allowNewUsers ?? false,
      directMessagesEnabled: settings.directMessagesEnabled ?? true,
      enablePlugins: settings.enablePlugins ?? false,
      webRtcSimulcastEnabled: settings.webRtcSimulcastEnabled ?? false,
      enableSearch: settings.enableSearch ?? true,
      showWelcomeDialog: settings.showWelcomeDialog ?? true
    });
  }, [settings, reset]);

  const handleLogoPick = useCallback(async () => {
    const picked = await pickImage();

    if (picked) onChange('logo', picked);
  }, [onChange, pickImage]);

  const handleLogoRemove = useCallback(
    () => onChange('logo', null),
    [onChange]
  );

  const handleFeatureChange = useCallback(
    (key: TGeneralFeatureKey, checked: boolean) => onChange(key, checked),
    [onChange]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  const logoUrl =
    values.logo !== undefined
      ? (values.logo?.previewUrl ?? '')
      : getFileUrl(settings?.logo);
  const logoInitial = (values.name || settings?.name || 'D')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <SettingsSection
      title={t('serverInfoTitle')}
      description={t('serverInfoDesc')}
    >
      <div className="flex w-full max-w-[900px] flex-col gap-[22px]">
        <div className="flex w-full max-w-[880px] flex-col gap-4">
          <div className="flex flex-col gap-[7px]">
            <label
              className="text-sm font-semibold leading-[18px] text-foreground"
              htmlFor="server-name"
            >
              {t('nameLabel')}
            </label>
            <Input
              id="server-name"
              placeholder={t('namePlaceholder')}
              className="h-[44px] max-w-[550px] rounded-[8px] border-control-border px-[13px] text-sm"
              {...r('name')}
            />
          </div>

          <div className="flex flex-col gap-[7px]">
            <label
              className="text-sm font-semibold leading-[18px] text-foreground"
              htmlFor="server-description"
            >
              {t('descriptionLabel')}
            </label>
            <Textarea
              id="server-description"
              rows={2}
              placeholder={t('descriptionPlaceholder')}
              className="min-h-[62px] max-w-[550px] rounded-[8px] border-control-border px-[13px] py-[13px] text-sm"
              {...r('description')}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 md:flex-row md:items-start">
          <div className="flex w-full max-w-[520px] flex-col gap-2 md:w-[520px] md:shrink-0">
            <label
              className="text-sm leading-4 text-foreground"
              htmlFor="server-password"
            >
              {t('serverPasswordLabel')}
            </label>
            <Input
              id="server-password"
              placeholder={t('serverPasswordPlaceholder')}
              className="h-[44px] rounded-[8px] border-control-border px-[13px] text-sm"
              {...r('password', 'password')}
            />
            <span className="text-xs leading-4 text-subtle-foreground">
              {t('serverPasswordHelper')}
            </span>
          </div>

          <div className="flex w-full max-w-[260px] flex-col gap-2 md:w-[260px] md:shrink-0">
            <span className="text-sm leading-4 text-foreground">
              {t('logoLabel')}
            </span>
            <button
              type="button"
              onClick={handleLogoPick}
              className="flex h-[74px] w-full items-center gap-[13px] rounded-[8px] border border-control-border bg-input-surface p-[10px] text-left transition-colors hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <span className="flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-primary text-lg font-bold text-primary-foreground">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  logoInitial
                )}
              </span>
              <span className="text-sm leading-4 text-muted-foreground">
                {t('changeLogoLabel')}
              </span>
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleLogoRemove}
                className="self-start text-xs leading-4 text-subtle-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t('removeLogoLabel')}
              </button>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-1">
          <div className="pt-[14px] pb-1">
            <h3 className="text-[17px] font-bold leading-[22px] text-foreground">
              {t('accessFeaturesTitle')}
            </h3>
          </div>

          {GENERAL_FEATURES.map((feature) => (
            <FeatureToggle
              key={feature.key}
              feature={feature}
              checked={values[feature.key]}
              onChange={handleFeatureChange}
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  );
});

export { General };
