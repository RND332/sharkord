import { ChannelPermission } from '@sharkord/shared';
import { Switch } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TChannelPermission } from './types';

const availableChannelPermissions = Object.values(ChannelPermission);

type TChannelPermissionItemProps = {
  permission: ChannelPermission;
  enabled: boolean;
  onTogglePermission: (permission: ChannelPermission) => void;
};

const ChannelPermissionItem = memo(
  ({
    permission,
    enabled,
    onTogglePermission
  }: TChannelPermissionItemProps) => {
    const { t } = useTranslation('permissions');
    const { t: tSettings } = useTranslation('settings');

    const handleChange = useCallback(() => {
      onTogglePermission(permission);
    }, [onTogglePermission, permission]);

    return (
      <div className="flex min-h-[30px] items-center justify-between gap-4 border-b border-line py-[9px]">
        <span className="min-w-0 truncate text-[13px] leading-4 text-foreground">
          {t(`channel.${permission}`)}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            aria-label={t(`channel.${permission}`)}
            checked={enabled}
            onCheckedChange={handleChange}
          />
          <span
            className={
              enabled
                ? 'w-[52px] text-xs leading-4 text-accent-text'
                : 'w-[52px] text-xs leading-4 text-muted-foreground'
            }
          >
            {enabled
              ? tSettings('permissionAllowed')
              : tSettings('permissionDenied')}
          </span>
        </div>
      </div>
    );
  }
);

type TChannelPermissionListProps = {
  permissions: TChannelPermission[];
  onTogglePermission: (permission: ChannelPermission) => void;
};

const ChannelPermissionList = memo(
  ({ permissions, onTogglePermission }: TChannelPermissionListProps) => {
    const { t } = useTranslation('permissions');
    // Convert permissions array to a map for quick lookup
    const permissionsMap = useMemo(() => {
      const map = new Map<string, boolean>();
      permissions.forEach((perm) => {
        map.set(perm.permission, perm.allow);
      });
      return map;
    }, [permissions]);

    const handleToggle = useCallback(
      (permission: ChannelPermission) => {
        onTogglePermission(permission);
      },
      [onTogglePermission]
    );

    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-bold uppercase leading-[18px] tracking-[1px] text-subtle-foreground">
          {t('headers.channel')}
        </h3>

        <div className="flex flex-col">
          {availableChannelPermissions.map((permission) => (
            <ChannelPermissionItem
              key={permission}
              permission={permission}
              enabled={permissionsMap.get(permission) ?? false}
              onTogglePermission={handleToggle}
            />
          ))}
        </div>
      </div>
    );
  }
);

export { ChannelPermissionList };
