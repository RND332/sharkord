import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { StatePanel } from '@/components/server-screens/settings-shell/state-panel';
import { useAdminChannelPermissions } from '@/features/server/admin/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  ExclamationTriangleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { ChannelPermission } from '@sharkord/shared';
import { Alert, AlertDescription, AlertTitle, LoadingCard } from '@sharkord/ui';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Override } from './override';
import { OverridesList } from './overrides-list';
import type { TChannelPermission } from './types';

type TChannelPermissionsProps = {
  channelId: number;
};

const ChannelPermissions = memo(({ channelId }: TChannelPermissionsProps) => {
  const { t } = useTranslation('settings');
  const [selectedOverrideId, setSelectedOverrideId] = useState<
    string | undefined
  >();
  const channel = useChannelById(channelId);
  const { rolePermissions, userPermissions, loading, refetch } =
    useAdminChannelPermissions(channelId);

  const selectedPermissions = useMemo<TChannelPermission[]>(() => {
    if (!selectedOverrideId) return [];

    const [type, idStr] = selectedOverrideId.split('-');
    const id = parseInt(idStr, 10);
    const matches =
      type === 'role'
        ? rolePermissions.filter((perm) => perm.roleId === id)
        : userPermissions.filter((perm) => perm.userId === id);

    return matches.map((perm) => ({
      permission: perm.permission as ChannelPermission,
      allow: perm.allow
    }));
  }, [selectedOverrideId, rolePermissions, userPermissions]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection
      className="max-w-[900px]"
      title={t('permissionsTitle')}
      description={t('permissionsDesc')}
    >
      {!channel?.private && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon />
          <AlertTitle>{t('publicChannelTitle')}</AlertTitle>
          <AlertDescription>{t('publicChannelDesc')}</AlertDescription>
        </Alert>
      )}

      <div className="flex w-full flex-col overflow-hidden rounded-[8px] border border-line bg-canvas md:flex-row">
        <OverridesList
          channelId={channelId}
          rolePermissions={rolePermissions}
          userPermissions={userPermissions}
          selectedOverrideId={selectedOverrideId}
          setSelectedOverrideId={setSelectedOverrideId}
          refetch={refetch}
        />

        {selectedOverrideId ? (
          <Override
            key={selectedOverrideId}
            channelId={channelId}
            overrideId={selectedOverrideId}
            permissions={selectedPermissions}
            setSelectedOverrideId={setSelectedOverrideId}
            refetch={refetch}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center px-[24px] py-[20px]">
            <StatePanel icon={UsersIcon} title={t('selectRoleOrUser')} />
          </div>
        )}
      </div>
    </SettingsSection>
  );
});

export { ChannelPermissions };
