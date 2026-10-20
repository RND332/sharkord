import { XMarkIcon } from '@heroicons/react/24/outline';
import type { TRole } from '@sharkord/shared';
import { Badge, IconButton } from '@sharkord/ui';
import { memo } from 'react';

type TRoleBadgeProps = {
  role: Pick<TRole, 'id' | 'name' | 'color'>;
  onRemoveRole?: (roleId: number, roleName: string) => void;
};

const RoleBadge = memo(({ role, onRemoveRole }: TRoleBadgeProps) => {
  return (
    <Badge
      style={{
        backgroundColor: role.color + '20',
        borderColor: role.color
      }}
    >
      <span style={{ color: role.color }}>{role.name}</span>
      {onRemoveRole && (
        <IconButton
          icon={XMarkIcon}
          size="xs"
          aria-label={`Remove ${role.name} role`}
          style={{ color: role.color }}
          onClick={() => onRemoveRole(role.id, role.name)}
        />
      )}
    </Badge>
  );
});

export { RoleBadge };
