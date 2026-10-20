import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { requestTextInput } from '@/features/dialogs/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { usePickImage, type TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR, UserStatus } from '@sharkord/shared';
import { ColorPicker, Textarea } from '@sharkord/ui';
import { Check, Image as ImageIcon, Palette, Pencil, X } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TProfileValues = {
  name: string;
  profileColor: string;
  bio: string;
  // undefined means untouched, null means remove
  avatar?: TPickedImage | null;
  banner?: TPickedImage | null;
};

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();
  const pickImage = usePickImage();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const onSave = useCallback(async (values: TProfileValues) => {
    const trpc = getTRPCClient();

    await trpc.users.update.mutate({
      name: values.name,
      profileColor: values.profileColor,
      bio: values.bio
    });

    if (values.avatar !== undefined) {
      await trpc.users.changeAvatar.mutate({ fileId: values.avatar?.fileId });
    }

    if (values.banner !== undefined) {
      await trpc.users.changeBanner.mutate({ fileId: values.banner?.fileId });
    }
  }, []);

  const { values, onChange } = useSettingsForm<TProfileValues>({
    initialValues: {
      name: ownPublicUser?.name ?? '',
      profileColor: ownPublicUser?.profileColor ?? DEFAULT_PROFILE_COLOR,
      bio: ownPublicUser?.bio ?? ''
    },
    onSave,
    successMessage: t('profileUpdated'),
    errorMessage: t('failedUpdateProfile')
  });

  const handleAvatarPick = useCallback(async () => {
    const picked = await pickImage();

    if (picked) onChange('avatar', picked);
  }, [onChange, pickImage]);

  const handleBannerPick = useCallback(async () => {
    const picked = await pickImage();

    if (picked) onChange('banner', picked);
  }, [onChange, pickImage]);

  const handleEditName = useCallback(async () => {
    const nextName = await requestTextInput({
      title: t('usernameLabel'),
      confirmLabel: t('saveChanges'),
      allowEmpty: false
    });

    if (!nextName) return;

    onChange('name', nextName);
  }, [onChange, t]);

  const handleToggleBio = useCallback(() => {
    setIsEditingBio((editing) => !editing);
  }, []);

  const handleBioChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange('bio', event.target.value);
    },
    [onChange]
  );

  const handleToggleColorPicker = useCallback(() => {
    setIsColorPickerOpen((open) => !open);
  }, []);

  const handleColorChange = useCallback(
    (color: string) => onChange('profileColor', color),
    [onChange]
  );

  const statusLabel = useMemo(() => {
    if (ownPublicUser?.status === UserStatus.IDLE)
      return t('profileStatusIdle');
    if (ownPublicUser?.status === UserStatus.OFFLINE) {
      return t('profileStatusOffline');
    }

    return t('profileStatusOnline');
  }, [ownPublicUser?.status, t]);

  if (!ownPublicUser) return null;

  const avatarUrl =
    values.avatar?.previewUrl ?? getFileUrl(ownPublicUser.avatar);
  const bannerUrl =
    values.banner?.previewUrl ?? getFileUrl(ownPublicUser.banner);

  return (
    <SettingsSection title={t('profileTitle')} description={t('profileDesc')}>
      <div className="w-full max-w-[600px] overflow-hidden rounded-[10px] border border-line bg-nav">
        <div className="relative flex h-[148px] items-start justify-end gap-2 bg-[#3B495C] p-[14px]">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <button
            type="button"
            onClick={handleBannerPick}
            aria-label={t('changeBannerLabel')}
            className="relative flex size-[34px] items-center justify-center rounded-md bg-[#202328CC] text-[#F2F4F6] transition-colors hover:bg-[#202328]"
          >
            <ImageIcon className="size-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleToggleColorPicker}
            aria-label={t('profileColorLabel')}
            className="relative flex size-[34px] items-center justify-center rounded-md bg-[#202328CC] text-[#F2F4F6] transition-colors hover:bg-[#202328]"
          >
            <Palette className="size-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleBannerPick}
            aria-label={t('changeBannerLabel')}
            className="relative flex size-[34px] items-center justify-center rounded-md bg-[#202328CC] text-[#F2F4F6] transition-colors hover:bg-[#202328]"
          >
            <Pencil className="size-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col px-6 pb-[26px]">
          <div className="flex h-12 items-start">
            <div
              className="relative -top-10 flex size-[82px] shrink-0 items-center justify-center overflow-visible rounded-full border-[5px] border-[#202328]"
              style={{ backgroundColor: values.profileColor }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold leading-[30px] text-foreground">
                  {getInitialsFromName(values.name)}
                </span>
              )}

              <button
                type="button"
                onClick={handleAvatarPick}
                aria-label={t('changeAvatarLabel')}
                className="absolute -right-1 -bottom-[3px] flex size-7 items-center justify-center rounded-full border-[3px] border-[#202328] bg-primary text-primary-foreground"
              >
                <Pencil className="size-[18px]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex min-h-[35px] items-center gap-2.5">
            <span className="text-2xl font-bold leading-[30px] tracking-[-0.4px]">
              {values.name}
            </span>
            <button
              type="button"
              onClick={handleEditName}
              aria-label={t('editNameLabel')}
              className="flex size-7 shrink-0 items-center justify-center rounded-[5px] bg-panel text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-0.5 text-sm leading-4 text-success">
            ● {statusLabel}
          </div>

          <div className="mt-5 mb-[18px] h-px shrink-0 bg-raised" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-[7px]">
              <span className="text-sm font-bold uppercase leading-[18px] tracking-[1px] text-muted-foreground">
                {t('aboutMeLabel')}
              </span>
              {isEditingBio ? (
                <Textarea
                  value={values.bio}
                  onChange={handleBioChange}
                  placeholder={t('bioPlaceholder')}
                  className="min-h-[80px] w-full"
                  autoFocus
                />
              ) : (
                <span className="text-sm leading-[21px] text-foreground">
                  {values.bio || t('bioPlaceholder')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleBio}
              aria-label={isEditingBio ? t('saveChanges') : t('editBioLabel')}
              className="flex size-7 shrink-0 items-center justify-center rounded-[5px] bg-panel text-muted-foreground transition-colors hover:text-foreground"
            >
              {isEditingBio ? (
                <Check className="size-5" strokeWidth={1.5} />
              ) : (
                <Pencil className="size-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {isColorPickerOpen && (
        <div className="w-full max-w-[260px] rounded-md border border-line bg-nav p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-foreground">
              {t('profileColorLabel')}
            </span>
            <button
              type="button"
              onClick={handleToggleColorPicker}
              aria-label={t('close')}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <ColorPicker
            value={values.profileColor}
            onChange={handleColorChange}
            defaultValue={DEFAULT_PROFILE_COLOR}
          />
        </div>
      )}
    </SettingsSection>
  );
});

export { Profile };
