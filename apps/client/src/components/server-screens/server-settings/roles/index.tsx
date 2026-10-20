import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { StatePanel } from '@/components/server-screens/settings-shell/state-panel';
import { useAdminRoles } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { PlusIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { Card, LoadingCard } from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { RolesList } from './roles-list';
import { UpdateRole } from './update-role';

const Roles = memo(() => {
  const { t } = useTranslation('settings');
  const { roles, refetch, loading } = useAdminRoles();

  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>();

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId]
  );

  const onAddRole = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const newRoleId = await trpc.roles.add.mutate();

      await refetch();

      setSelectedRoleId(newRoleId);
      toast.success(t('roleCreated'));
    } catch {
      toast.error(t('roleCreateFailed'));
    }
  }, [refetch, t]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection
      title={t('rolesTitle')}
      description={t('rolesDesc')}
      action={
        <button
          type="button"
          onClick={onAddRole}
          aria-label={t('addRoleTooltip')}
          title={t('addRoleTooltip')}
          className="flex size-[38px] items-center justify-center rounded-[7px] bg-raised text-foreground transition-colors hover:bg-panel focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PlusIcon className="size-6" strokeWidth={1.5} />
        </button>
      }
    >
      <div className="flex flex-col gap-6 md:flex-row md:gap-[30px]">
        <div className="w-full shrink-0 md:w-[238px]">
          <RolesList
            roles={roles}
            selectedRoleId={selectedRoleId}
            setSelectedRoleId={setSelectedRoleId}
          />
        </div>

        <div className="min-w-0 flex-1 md:max-w-[772px]">
          {selectedRole ? (
            <UpdateRole
              key={selectedRole.id}
              selectedRole={selectedRole}
              setSelectedRoleId={setSelectedRoleId}
              refetch={refetch}
            />
          ) : (
            <Card className="flex min-h-40 items-center justify-center">
              <StatePanel
                icon={ShieldExclamationIcon}
                title={t('selectRoleToEdit')}
              />
            </Card>
          )}
        </div>
      </div>
    </SettingsSection>
  );
});

export { Roles };
