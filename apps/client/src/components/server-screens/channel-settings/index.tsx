import { useCan } from '@/features/server/hooks';
import { Permission } from '@dodecagon/shared';
import {
  Cog6ToothIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { SettingsShell } from '../settings-shell';
import type { TSettingsEntry } from '../settings-shell/types';
import { General } from './general';
import { ChannelPermissions } from './permissions';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, channelId }: TChannelSettingsProps) => {
  const { t } = useTranslation('settings');

  const can = useCan();

  const entries = useMemo<TSettingsEntry[]>(() => {
    const all = [
      {
        id: 'general',
        label: t('generalTab'),
        icon: Cog6ToothIcon,
        content: <General channelId={channelId} />,
        permission: Permission.MANAGE_CHANNELS
      },
      {
        id: 'permissions',
        label: t('permissionsTab'),
        icon: ShieldExclamationIcon,
        content: <ChannelPermissions channelId={channelId} />,
        permission: Permission.MANAGE_CHANNEL_PERMISSIONS
      }
    ];

    return all
      .filter((entry) => can(entry.permission))
      .map(({ id, label, icon, content }) => ({ id, label, icon, content }));
  }, [t, can, channelId]);

  return (
    <SettingsShell
      title={t('channelSettingsTitle')}
      close={close}
      entries={entries}
      groupLabel={t('groupChannel')}
    />
  );
});

export { ChannelSettings };
