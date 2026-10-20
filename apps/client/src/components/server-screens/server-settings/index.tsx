import { useAdminPlugins } from '@/features/server/admin/hooks';
import { useCan, usePluginsEnabled } from '@/features/server/hooks';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  CubeIcon,
  EnvelopeIcon,
  FaceSmileIcon,
  PuzzlePieceIcon,
  ShieldExclamationIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { Permission } from '@sharkord/shared';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { SettingsShell } from '../settings-shell';
import type { TSettingsEntry } from '../settings-shell/types';
import { Emojis } from './emojis';
import { General } from './general';
import { Invites } from './invites';
import { PluginView } from './plugin-view';
import { Plugins } from './plugins';
import { Roles } from './roles';
import { Storage } from './storage';
import { Updates } from './updates';
import { Users as UsersSection } from './users';

type TServerSettingsProps = TServerScreenBaseProps;

const ServerSettings = memo(({ close }: TServerSettingsProps) => {
  const { t } = useTranslation('settings');
  const can = useCan();
  const pluginsEnabled = usePluginsEnabled();
  const canManagePlugins = can(Permission.MANAGE_PLUGINS);
  const {
    plugins,
    loading: pluginsLoading,
    refetch: refetchPlugins
  } = useAdminPlugins(canManagePlugins);

  const entries = useMemo<TSettingsEntry[]>(() => {
    const all = [
      {
        id: 'general',
        label: t('generalTab'),
        icon: Cog6ToothIcon,
        content: <General />,
        permission: Permission.MANAGE_SETTINGS
      },
      {
        id: 'roles',
        label: t('rolesTab'),
        icon: ShieldExclamationIcon,
        content: <Roles />,
        permission: Permission.MANAGE_ROLES
      },
      {
        id: 'emojis',
        label: t('emojisTab'),
        icon: FaceSmileIcon,
        content: <Emojis />,
        permission: Permission.MANAGE_EMOJIS
      },
      {
        id: 'storage',
        label: t('storageTab'),
        icon: CubeIcon,
        content: <Storage />,
        permission: Permission.MANAGE_STORAGE
      },
      {
        id: 'users',
        label: t('usersTab'),
        icon: UsersIcon,
        content: <UsersSection />,
        permission: Permission.MANAGE_USERS
      },
      {
        id: 'invites',
        label: t('invitesTab'),
        icon: EnvelopeIcon,
        content: <Invites />,
        permission: Permission.MANAGE_INVITES
      },
      {
        id: 'updates',
        label: t('updatesTab'),
        icon: ArrowPathIcon,
        content: <Updates />,
        permission: Permission.MANAGE_UPDATES
      },
      {
        id: 'plugins',
        label: t('pluginsTab'),
        icon: PuzzlePieceIcon,
        content: (
          <Plugins
            plugins={plugins}
            loading={pluginsLoading}
            refetch={refetchPlugins}
          />
        ),
        permission: Permission.MANAGE_PLUGINS
      }
    ];

    return all
      .filter((entry) => can(entry.permission))
      .map(({ id, label, icon, content }) => ({ id, label, icon, content }));
  }, [t, can, plugins, pluginsLoading, refetchPlugins]);

  // an enabled plugin that failed to load still gets an entry, its view is where the reason lives
  const pluginEntries = useMemo<TSettingsEntry[]>(() => {
    if (!canManagePlugins || !pluginsEnabled) return [];

    return plugins
      .filter((plugin) => plugin.enabled)
      .map((plugin) => ({
        id: `plugin-${plugin.id}`,
        label: plugin.name,
        icon: CubeIcon,
        logo: plugin.logo,
        error: plugin.loadError,
        content: <PluginView plugin={plugin} />
      }));
  }, [plugins, canManagePlugins, pluginsEnabled]);

  return (
    <SettingsShell
      title={t('serverSettingsTitle')}
      close={close}
      entries={entries}
      pluginEntries={pluginEntries}
      groupLabel={t('groupAdministration')}
    />
  );
});

export { ServerSettings };
