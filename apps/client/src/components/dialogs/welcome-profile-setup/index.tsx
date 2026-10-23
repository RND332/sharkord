import { useServerName } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { uploadImage } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR, getTrpcError } from '@dodecagon/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Textarea
} from '@dodecagon/ui';
import {
  ArrowRightIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TWelcomeProfileSetupDialogProps = TDialogBaseProps;

const WelcomeProfileSetupDialog = memo(
  ({ isOpen, close }: TWelcomeProfileSetupDialogProps) => {
    const { t } = useTranslation('dialogs');
    const serverName = useServerName();
    const ownPublicUser = useOwnPublicUser();
    const openFilePicker = useFilePicker();
    const [loading, setLoading] = useState(false);
    const { r, values, setTrpcErrors } = useForm({
      name: ownPublicUser?.name ?? '',
      bio: ownPublicUser?.bio ?? ''
    });

    const onAvatarClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const [file] = await openFilePicker('image/*');

        const temporaryFile = await uploadImage(file);

        if (!temporaryFile) {
          return;
        }

        await trpc.users.changeAvatar.mutate({ fileId: temporaryFile.id });
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeUpdateAvatarError')));
      }
    }, [openFilePicker, t]);

    const onAvatarRemove = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.users.changeAvatar.mutate({});
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeRemoveAvatarError')));
      }
    }, [t]);

    const onBannerClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const [file] = await openFilePicker('image/*');

        const temporaryFile = await uploadImage(file);

        if (!temporaryFile) {
          return;
        }

        await trpc.users.changeBanner.mutate({ fileId: temporaryFile.id });
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeUpdateBannerError')));
      }
    }, [openFilePicker, t]);

    const onBannerRemove = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.users.changeBanner.mutate({});
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeRemoveBannerError')));
      }
    }, [t]);

    const onSave = useCallback(async () => {
      if (!ownPublicUser) return;

      const trpc = getTRPCClient();
      const trimmedBio = values.bio.trim();

      setLoading(true);

      try {
        await trpc.users.update.mutate({
          name: values.name.trim(),
          profileColor: ownPublicUser.profileColor ?? DEFAULT_PROFILE_COLOR,
          bio: trimmedBio || undefined
        });

        toast.success(t('welcomeProfileSaved'));
        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [close, ownPublicUser, setTrpcErrors, t, values.bio, values.name]);

    const onAvatarRemoveClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onAvatarRemove();
      },
      [onAvatarRemove]
    );

    const onBannerRemoveClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onBannerRemove();
      },
      [onBannerRemove]
    );

    if (!ownPublicUser) return null;

    const profileColor = ownPublicUser.profileColor || '#5865f2';

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0"
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-5 pr-14">
            <DialogTitle>
              {t('welcomeProfileSetupTitle', {
                serverName: serverName ?? 'Dodecagon'
              })}
            </DialogTitle>
            <DialogDescription>
              {t('welcomeProfileSetupDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">
            <div className="flex items-center gap-4">
              <div className="group/avatar relative shrink-0">
                <button
                  type="button"
                  className="block size-[70px] cursor-pointer overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onAvatarClick}
                  aria-label={t('welcomeChangeAvatarBtn')}
                >
                  <Avatar
                    className="size-[70px] rounded-full"
                    style={{ backgroundColor: profileColor }}
                  >
                    <AvatarImage
                      src={getFileUrl(ownPublicUser.avatar)}
                      key={ownPublicUser.avatarId}
                      className="size-full"
                    />
                    <AvatarFallback className="bg-transparent text-[21px] font-bold leading-[26px]">
                      {getInitialsFromName(ownPublicUser.name)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-opacity group-hover/avatar:bg-black/50">
                    <ArrowUpTrayIcon className="size-5 text-white" />
                  </span>
                </button>

                {ownPublicUser.avatar && (
                  <IconButton
                    icon={XMarkIcon}
                    size="sm"
                    aria-label={t('welcomeRemoveAvatarBtn')}
                    className="absolute -top-1 -right-1 opacity-0 transition-opacity group-hover/avatar:opacity-100"
                    onClick={onAvatarRemoveClick}
                  />
                )}
              </div>

              <button
                type="button"
                className="text-[13px] leading-4 text-accent-text transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onAvatarClick}
              >
                {t('welcomeChangeAvatarBtn')}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="welcome-display-name"
                className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground"
              >
                {t('welcomeDisplayNameLabel')}
              </label>
              <Input
                id="welcome-display-name"
                {...r('name')}
                className="h-[46px] px-[14px] text-[15px] leading-[18px] md:text-[15px]"
                placeholder={t('welcomeUsernamePlaceholder')}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-line pt-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground">
                  {t('welcomeBannerLabel')}
                </span>

                <div
                  className="group/banner relative h-[72px] w-full overflow-hidden rounded-[8px] border border-line"
                  style={{ backgroundColor: profileColor }}
                >
                  {ownPublicUser.banner && (
                    <img
                      src={getFileUrl(ownPublicUser.banner)}
                      alt=""
                      className="size-full object-cover transition-opacity group-hover/banner:opacity-70"
                    />
                  )}

                  <button
                    type="button"
                    className="absolute inset-0 size-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={onBannerClick}
                    aria-label={t('welcomeChangeBannerBtn')}
                  >
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-opacity group-hover/banner:bg-black/50">
                      <span className="rounded-full bg-black/50 p-2">
                        <ArrowUpTrayIcon className="size-4 text-white" />
                      </span>
                    </span>
                  </button>

                  {ownPublicUser.banner && (
                    <IconButton
                      icon={XMarkIcon}
                      size="sm"
                      aria-label={t('welcomeRemoveBannerBtn')}
                      className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover/banner:opacity-100"
                      onClick={onBannerRemoveClick}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground">
                  {t('welcomeBioLabel')}
                </span>
                <Textarea
                  {...r('bio')}
                  placeholder={t('welcomeBioPlaceholder')}
                  rows={3}
                />
              </div>
            </div>

            <p className="text-[13px] leading-5 text-muted-foreground">
              {t('welcomeProfileHint')}
            </p>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2.5 sm:mx-0 sm:mb-0">
            <Button variant="outline" onClick={close}>
              {t('welcomeSkipBtn')}
            </Button>
            <Button
              onClick={onSave}
              disabled={loading || !values.name.trim().length}
            >
              <ArrowRightIcon className="size-5" />
              {t('welcomeSaveBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { WelcomeProfileSetupDialog };
