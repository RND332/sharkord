import { useRoleById } from '@/features/server/roles/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import type {
  TChannelRolePermission,
  TChannelUserPermission
} from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchPopover } from './search-popover';
import type { TChannelPermissionType } from './types';

type TOverrideItemProps = {
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  isSelected: boolean;
  children: ReactNode;
};

const OverrideItem = memo(
  ({
    selectedKey,
    setSelectedKey,
    isSelected,
    children
  }: TOverrideItemProps) => {
    const handleClick = useCallback(
      () => setSelectedKey(selectedKey),
      [selectedKey, setSelectedKey]
    );

    return (
      <button
        onClick={handleClick}
        aria-current={isSelected ? 'true' : undefined}
        className={cn(
          'flex w-full items-center gap-[9px] rounded-[6px] px-[10px] py-[10px] text-left text-[13px] leading-4 transition-colors',
          isSelected
            ? 'bg-raised text-foreground'
            : 'text-muted-foreground hover:bg-raised'
        )}
      >
        {children}
      </button>
    );
  }
);

type TRoleItemProps = {
  roleId: number;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const RoleItem = memo(
  ({ roleId, selectedKey, setSelectedKey }: TRoleItemProps) => {
    const role = useRoleById(roleId);
    const key = `role-${roleId}`;
    const isSelected = selectedKey === key;

    if (!role) return null;

    return (
      <OverrideItem
        selectedKey={key}
        setSelectedKey={setSelectedKey}
        isSelected={isSelected}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: role.color }}
        />
        <span className="truncate">{role.name}</span>
      </OverrideItem>
    );
  }
);

type TUserItemProps = {
  userId: number;
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const UserItem = memo(
  ({ userId, selectedKey, setSelectedKey }: TUserItemProps) => {
    const user = useUserById(userId);
    const key = `user-${userId}`;
    const isSelected = selectedKey === key;

    if (!user) return null;

    return (
      <OverrideItem
        selectedKey={key}
        setSelectedKey={setSelectedKey}
        isSelected={isSelected}
      >
        <Avatar className="size-5 shrink-0">
          <AvatarFallback className="text-[10px]">
            {getInitialsFromName(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{user.name}</span>
      </OverrideItem>
    );
  }
);

type TRolesSectionProps = {
  rolePermissions: TChannelRolePermission[];
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const RolesSection = memo(
  ({ rolePermissions, selectedKey, setSelectedKey }: TRolesSectionProps) => {
    const { t } = useTranslation('settings');
    const roleIds = useMemo(
      () => Array.from(new Set(rolePermissions.map((perm) => perm.roleId))),
      [rolePermissions]
    );

    if (roleIds.length === 0) return null;

    return (
      <>
        <span className="px-[10px] pt-3 pb-1 text-[10px] font-bold uppercase leading-3 tracking-[1px] text-subtle-foreground">
          {t('rolesSection')}
        </span>
        {roleIds.map((roleId) => (
          <RoleItem
            key={roleId}
            roleId={roleId}
            selectedKey={selectedKey}
            setSelectedKey={setSelectedKey}
          />
        ))}
      </>
    );
  }
);

type TUsersSectionProps = {
  userPermissions: TChannelUserPermission[];
  selectedKey: string;
  setSelectedKey: (key: string) => void;
};

const UsersSection = memo(
  ({ userPermissions, selectedKey, setSelectedKey }: TUsersSectionProps) => {
    const { t } = useTranslation('settings');
    const userIds = useMemo(
      () => Array.from(new Set(userPermissions.map((perm) => perm.userId))),
      [userPermissions]
    );

    if (userIds.length === 0) return null;

    return (
      <>
        <span className="px-[10px] pt-3 pb-1 text-[10px] font-bold uppercase leading-3 tracking-[1px] text-subtle-foreground">
          {t('membersLabel')}
        </span>
        {userIds.map((userId) => (
          <UserItem
            key={userId}
            userId={userId}
            selectedKey={selectedKey}
            setSelectedKey={setSelectedKey}
          />
        ))}
      </>
    );
  }
);

type TOverridesListProps = {
  channelId: number;
  rolePermissions: TChannelRolePermission[];
  userPermissions: TChannelUserPermission[];
  selectedOverrideId: string | undefined;
  setSelectedOverrideId: (id: string | undefined) => void;
  refetch: () => Promise<void>;
};

const OverridesList = memo(
  ({
    rolePermissions,
    userPermissions,
    selectedOverrideId,
    channelId,
    setSelectedOverrideId,
    refetch
  }: TOverridesListProps) => {
    const { t } = useTranslation('settings');
    const hasRoles = rolePermissions.length > 0;
    const hasUsers = userPermissions.length > 0;
    const isEmpty = !hasRoles && !hasUsers;

    const usedRolesIds = useMemo(() => {
      return Array.from(new Set(rolePermissions.map((perm) => perm.roleId)));
    }, [rolePermissions]);

    const usedUserIds = useMemo(() => {
      return Array.from(new Set(userPermissions.map((perm) => perm.userId)));
    }, [userPermissions]);

    const onSelect = useCallback(
      async (type: TChannelPermissionType, targetId: number) => {
        const trpc = getTRPCClient();

        try {
          const payload = {
            channelId
          };

          if (type === 'role') {
            Object.assign(payload, { roleId: targetId });
          } else {
            Object.assign(payload, { userId: targetId });
          }

          await trpc.channels.updatePermissions.mutate({
            ...payload,
            isCreate: true
          });

          toast.success(t('permissionOverrideAdded'));

          setSelectedOverrideId(`${type}-${targetId}`);

          await refetch();
        } catch (error) {
          toast.error(getTrpcError(error, t('failedAddPermissionOverride')));
        }
      },
      [channelId, setSelectedOverrideId, refetch, t]
    );

    return (
      <div className="flex w-full shrink-0 flex-col gap-2 p-[14px] md:w-[250px]">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[13px] font-bold uppercase leading-[18px] tracking-[1px] text-muted-foreground">
            {t('overridesLabel')}
          </span>
          <SearchPopover
            onSelect={onSelect}
            ignoreRoleIds={usedRolesIds}
            ignoreUserIds={usedUserIds}
          />
        </div>

        {isEmpty ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t('noPermissionOverridesYet')}
          </div>
        ) : (
          <>
            <RolesSection
              rolePermissions={rolePermissions}
              selectedKey={selectedOverrideId || ''}
              setSelectedKey={setSelectedOverrideId}
            />

            <UsersSection
              userPermissions={userPermissions}
              selectedKey={selectedOverrideId || ''}
              setSelectedKey={setSelectedOverrideId}
            />
          </>
        )}
      </div>
    );
  }
);

export { OverridesList };
