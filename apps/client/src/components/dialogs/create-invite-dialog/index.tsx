import { useRoles } from '@/features/server/roles/hooks';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { getRandomString } from '@dodecagon/shared';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@dodecagon/ui';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { memo, useCallback, useMemo, useState, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';
import { copyInviteLink } from './helpers';

type TCreateInviteDialogProps = TDialogBaseProps & {
  refetch: () => void;
};

type TInviteLinkDetails = {
  code: string;
  roleId: number | null;
  maxUses: number | null;
  expiresAt: number | null;
};

const MILLISECONDS_PER_DAY = 86_400_000;

type TInviteReadyLinkProps = {
  invite: TInviteLinkDetails;
};

export const InviteReadyLink = memo(({ invite }: TInviteReadyLinkProps) => {
  const { t } = useTranslation('dialogs');
  const roles = useRoles();

  const role = useMemo(
    () => roles.find((item) => item.id === invite.roleId),
    [invite.roleId, roles]
  );

  const inviteUrl = useMemo(
    () => `${getUrlFromServer()}/?invite=${invite.code}`,
    [invite.code]
  );

  const roleText = t('inviteMetaRole', {
    role: role ? role.name : t('roleDefault')
  });

  const expiryDays = invite.expiresAt
    ? Math.max(
        1,
        Math.ceil((invite.expiresAt - Date.now()) / MILLISECONDS_PER_DAY)
      )
    : null;

  const expiryText =
    expiryDays === null
      ? t('inviteNeverExpires')
      : t('inviteExpiresInDays', { count: expiryDays });

  const usesText = invite.maxUses
    ? t('inviteUseLimit', { count: invite.maxUses })
    : t('inviteNoUseLimit');

  const metaText = [roleText, expiryText, usesText].join(' · ');

  const handleSelectLink = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      event.currentTarget.select();
    },
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await copyInviteLink(inviteUrl);
      toast.success(t('inviteLinkCopied'));
    } catch {
      toast.error(t('failedCopyInviteLink'));
    }
  }, [inviteUrl, t]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('invitePeopleTitle')}</DialogTitle>
        <DialogDescription>{t('invitePeopleDesc')}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('inviteLinkLabel')}</p>
        <input
          readOnly
          value={inviteUrl}
          aria-label={t('inviteLinkLabel')}
          onFocus={handleSelectLink}
          className="flex min-h-[50px] w-full items-center rounded-md border border-control-border bg-input-surface px-4 py-[7px] text-[13px] leading-4 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[13px] leading-4 text-subtle-foreground">
          {metaText}
        </p>
      </div>

      <DialogFooter className="gap-2">
        <Button onClick={handleCopy}>
          <DocumentDuplicateIcon className="size-4" />
          {t('copyInviteLinkBtn')}
        </Button>
      </DialogFooter>
    </>
  );
});

const CreateInviteDialog = memo(
  ({ refetch, close, isOpen }: TCreateInviteDialogProps) => {
    const { t } = useTranslation('dialogs');
    const roles = useRoles();
    const [createdInvite, setCreatedInvite] =
      useState<TInviteLinkDetails | null>(null);
    const { r, rrn, values, setTrpcErrors, onChange } = useForm({
      maxUses: 0,
      expiresAt: 0,
      code: getRandomString(24),
      roleId: 0
    });

    const handleCreate = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const payload: Record<string, unknown> = { ...values };

        // Only send roleId if a role was selected (not "None")
        if (!payload.roleId) {
          delete payload.roleId;
        }

        const invite = await trpc.invites.add.mutate(payload);

        setCreatedInvite(invite);
        toast.success(t('inviteCreated'));

        refetch();
      } catch (error) {
        setTrpcErrors(error);
      }
    }, [refetch, setTrpcErrors, t, values]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          {createdInvite ? (
            <InviteReadyLink invite={createdInvite} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('createInviteTitle')}</DialogTitle>
                <DialogDescription>{t('createInviteDesc')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Group label={t('inviteCodeLabel')}>
                  <Input
                    placeholder={t('inviteCodePlaceholder')}
                    {...r('code')}
                  />
                </Group>
                <Group label={t('maxUsesLabel')} description={t('maxUsesDesc')}>
                  <Input
                    placeholder={t('maxUsesPlaceholder')}
                    {...r('maxUses', 'number')}
                  />
                </Group>
                <Group
                  label={t('expiresInLabel')}
                  description={t('expiresInDesc')}
                >
                  <DatePicker {...rrn('expiresAt')} minDate={Date.now()} />
                </Group>
                <Group
                  label={t('assignRoleLabel')}
                  description={t('assignRoleDesc')}
                >
                  <Select
                    onValueChange={(value) => onChange('roleId', Number(value))}
                    value={values.roleId.toString()}
                  >
                    <SelectTrigger className="w-[230px]">
                      <SelectValue placeholder={t('selectRolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('roleDefault')}</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Group>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={close}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreate}>{t('createInviteBtn')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateInviteDialog };
