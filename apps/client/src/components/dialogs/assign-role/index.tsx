import { PermissionsList } from '@/components/permissions-list';
import { useRoles } from '@/features/server/roles/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  getTrpcError,
  type TJoinedRole,
  type TJoinedUser
} from '@dodecagon/shared';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus
} from '@dodecagon/ui';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { memo, useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TAssignRoleDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
};

type TRoleAssignmentProps = {
  label: string;
  roles: TJoinedRole[];
  selectedRoleId: number;
  onSelect: (roleId: number) => void;
};

export const RoleAssignment = memo(
  ({ label, roles, selectedRoleId, onSelect }: TRoleAssignmentProps) => {
    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onSelect(Number(event.target.value));
      },
      [onSelect]
    );

    const selectedRole = useMemo(
      () => roles.find((role) => role.id === selectedRoleId),
      [roles, selectedRoleId]
    );

    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-4 text-muted-foreground">{label}</p>
        <div
          role="radiogroup"
          aria-label={label}
          className="flex flex-col gap-2"
        >
          {roles.map((role) => {
            const selected = role.id === selectedRoleId;

            return (
              <label key={role.id} className="block cursor-pointer">
                <input
                  type="radio"
                  name="assign-role"
                  value={role.id}
                  checked={selected}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-2 rounded-md border border-control-border bg-input-surface p-3.5 text-[15px] leading-[18px] text-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas',
                    selected && 'border-accent bg-raised text-accent-text'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 shrink-0 rounded-full border',
                      selected
                        ? 'border-accent-text bg-accent-text'
                        : 'border-muted-foreground'
                    )}
                  />
                  <span className="min-w-0 break-words">{role.name}</span>
                  {selected && <CheckIcon className="size-4 shrink-0" />}
                </span>
              </label>
            );
          })}
        </div>
        {selectedRole && (
          <PermissionsList
            permissions={selectedRole.permissions}
            variant="default"
            size="md"
          />
        )}
      </div>
    );
  }
);

const AssignRoleDialog = memo(
  ({ isOpen, close, user, refetch }: TAssignRoleDialogProps) => {
    const { t } = useTranslation('dialogs');
    const ownUserId = useOwnUserId();
    const roles = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
    const isOwnUser = ownUserId === user.id;

    // Filter out roles the user already has
    const availableRoles = useMemo(
      () => roles.filter((role) => !user.roleIds.includes(role.id)),
      [roles, user.roleIds]
    );

    const handleSelectRole = useCallback((roleId: number) => {
      setSelectedRoleId(roleId);
    }, []);

    const onSubmit = useCallback(async () => {
      if (selectedRoleId === 0) {
        toast.error(t('pleaseSelectRole'));
        return;
      }

      try {
        const trpc = getTRPCClient();

        await trpc.users.addRole.mutate({
          userId: user.id,
          roleId: selectedRoleId
        });

        toast.success(t('roleAssigned'));
        close();
        refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedAssignRole')));
      }
    }, [user.id, selectedRoleId, close, refetch, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('assignRoleTitle', { name: user.name })}
            </AlertDialogTitle>
            {isOwnUser && (
              <Alert variant="default">
                <InformationCircleIcon />
                <AlertDescription>
                  {t('selfRoleAssignWarning')}
                </AlertDescription>
              </Alert>
            )}
            {availableRoles.length === 0 && (
              <Alert variant="default">
                <InformationCircleIcon />
                <AlertDescription>{t('userHasAllRoles')}</AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            {availableRoles.length > 0 && (
              <RoleAssignment
                label={t('roleForUser', { name: user.name })}
                roles={availableRoles}
                selectedRoleId={selectedRoleId}
                onSelect={handleSelectRole}
              />
            )}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={close}>{t('cancel')}</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={availableRoles.length === 0 || selectedRoleId === 0}
              >
                {t('assignRoleBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { AssignRoleDialog };
