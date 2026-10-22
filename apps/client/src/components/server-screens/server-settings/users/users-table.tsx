import type { TAdminUser } from '@/features/server/admin/hooks';
import { PaginatedList } from '@dodecagon/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TableUser } from './table-user';

type TUsersTableProps = {
  refetch?: () => void;
};

const UsersTable = memo(({ refetch }: TUsersTableProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="w-full max-w-[1040px]">
      <div className="flex items-center border-b border-line py-[10px] text-[12px] uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
        <div className="min-w-0 flex-1 basis-0">{t('usersMemberCol')}</div>
        <div className="w-[180px] shrink-0">{t('usersRoleCol')}</div>
        <div className="w-[90px] shrink-0">{t('usersStatusCol')}</div>
        <div className="w-[44px] shrink-0" />
      </div>

      <PaginatedList.List<TAdminUser>
        className="divide-y divide-line"
        getItemKey={(user) => user.id}
      >
        {(user) => <TableUser user={user} refetch={refetch} />}
      </PaginatedList.List>

      <PaginatedList.Empty className="py-8 text-center text-sm text-muted-foreground">
        {t('noUsersFound')}
      </PaginatedList.Empty>

      <div className="flex items-center justify-between pt-4">
        <PaginatedList.Info className="text-xs text-muted-foreground" />
        <PaginatedList.Pagination />
      </div>
    </div>
  );
});

export { UsersTable };
