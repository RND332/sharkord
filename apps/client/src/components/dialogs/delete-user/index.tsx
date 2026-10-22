import { useServerName } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedUser } from '@dodecagon/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from '@dodecagon/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

// the word the requester has to type before the action unlocks
const DELETE_CONFIRMATION = 'DELETE';

type TDeleteUserDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
  onDelete?: () => void;
};

const DeleteUserDialog = memo(
  ({ isOpen, close, user, refetch, onDelete }: TDeleteUserDialogProps) => {
    const { t } = useTranslation('dialogs');
    const serverName = useServerName();
    const [confirmation, setConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const isConfirmed =
      confirmation.trim().toUpperCase() === DELETE_CONFIRMATION;

    const onConfirmationChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmation(event.target.value);
      },
      []
    );

    const onSubmit = useCallback(async () => {
      if (!isConfirmed || isDeleting) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        setIsDeleting(true);

        await trpc.users.delete.mutate({ userId: user.id });

        toast.success(t('userDeletedSuccess'));

        close();
        refetch();
        onDelete?.();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDeleteUser')));
      } finally {
        setIsDeleting(false);
      }
    }, [close, isConfirmed, isDeleting, onDelete, refetch, t, user.id]);

    const onCancel = useCallback(() => {
      close();
    }, [close]);

    // a destructive confirmation must not disappear under a stray click
    const onInteractOutside = useCallback((event: Event) => {
      event.preventDefault();
    }, []);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          onInteractOutside={onInteractOutside}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0"
        >
          <DialogHeader className="shrink-0 gap-1.5 px-6 pt-6 pb-5 pr-14">
            <DialogTitle className="text-[20px] leading-7 font-bold tracking-[-0.025em]">
              {t('deleteUserDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[19px]">
              {t('deleteUserDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">
            <p className="text-[15px] leading-[23px] text-foreground">
              {t('deleteUserQuestion', {
                name: user.name,
                server: serverName ?? ''
              })}
            </p>

            <p className="text-[14px] leading-[22px] text-muted-foreground">
              {t('deleteUserWarning')}
            </p>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="delete-user-confirmation"
                className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground"
              >
                {t('deleteUserConfirmLabel')}
              </label>
              <Input
                id="delete-user-confirmation"
                value={confirmation}
                onChange={onConfirmationChange}
                placeholder={t('deleteUserConfirmPlaceholder')}
                className="h-auto px-[15px] py-[15px] text-[15px] leading-[18px] md:text-[15px]"
                disabled={isDeleting}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2.5 bg-nav px-6 py-4">
            <Button variant="secondary" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={onSubmit}
              disabled={!isConfirmed || isDeleting}
            >
              {t('deleteUserBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { DeleteUserDialog };
