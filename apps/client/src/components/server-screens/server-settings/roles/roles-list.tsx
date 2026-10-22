import { cn } from '@/lib/utils';
import type { TJoinedRole } from '@dodecagon/shared';
import { memo, useCallback } from 'react';

type TRoleItemProps = {
  role: TJoinedRole;
  isSelected: boolean;
  onSelect: (roleId: number) => void;
};

const RoleItem = memo(({ role, isSelected, onSelect }: TRoleItemProps) => {
  const handleClick = useCallback(() => onSelect(role.id), [onSelect, role.id]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-[7px] px-3 text-left text-sm transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        isSelected ? 'bg-raised text-foreground' : 'text-muted-foreground'
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: role.color }}
      />
      <span className="truncate">{role.name}</span>
    </button>
  );
});

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId }: TRolesListProps) => {
    return (
      <div className="flex w-full flex-col gap-1">
        {roles.map((role) => (
          <RoleItem
            key={role.id}
            role={role}
            isSelected={selectedRoleId === role.id}
            onSelect={setSelectedRoleId}
          />
        ))}
      </div>
    );
  }
);

export { RolesList };
