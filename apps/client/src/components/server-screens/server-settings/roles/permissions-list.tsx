import { Permission as EPermission } from '@dodecagon/shared';
import { Switch } from '@dodecagon/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const availablePermissions = Object.values(EPermission);

type TPermissionProps = {
  permission: EPermission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
};

const Permission = memo(
  ({ permission, enabled, onChange, disabled }: TPermissionProps) => {
    const { t } = useTranslation('permissions');
    const { t: tSettings } = useTranslation('settings');

    return (
      <div className="flex min-h-[30px] items-center justify-between gap-4 border-b border-line py-[9px] last:border-b-0">
        <span className="min-w-0 truncate text-sm leading-[18px] text-foreground">
          {t(`server.${permission}`)}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            aria-label={t(`server.${permission}`)}
            checked={enabled}
            onCheckedChange={onChange}
            disabled={disabled}
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

type TPermissionListProps = {
  permissions: EPermission[];
  setPermissions: (permissions: EPermission[]) => void;
  disabled?: boolean;
};

const PermissionList = memo(
  ({ permissions, setPermissions, disabled }: TPermissionListProps) => {
    const { t } = useTranslation('permissions');

    const onTogglePermission = useCallback(
      (permission: EPermission) => {
        if (permissions.includes(permission)) {
          setPermissions(permissions.filter((p) => p !== permission));
        } else {
          setPermissions([...permissions, permission]);
        }
      },
      [permissions, setPermissions]
    );

    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold uppercase leading-[18px] tracking-[1px] text-subtle-foreground">
          {t('headers.server')}
        </h3>

        <div className="flex flex-col">
          {availablePermissions.map((permission) => (
            <Permission
              key={permission}
              permission={permission}
              enabled={permissions.includes(permission)}
              onChange={() => onTogglePermission(permission)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  }
);

export { PermissionList };
