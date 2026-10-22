import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import type { TAdminUser } from '@/features/server/admin/hooks';
import { useAdminUsers } from '@/features/server/admin/hooks';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { LoadingCard, PaginatedList } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersTable } from './users-table';

const USERS_PER_PAGE = 8;

const Users = memo(() => {
  const { t } = useTranslation('settings');
  const { users, loading, refetch } = useAdminUsers();

  const searchFilter = useCallback((user: TAdminUser, searchTerm: string) => {
    return user.name.toLowerCase().includes(searchTerm.toLowerCase());
  }, []);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <PaginatedList
      items={users}
      itemsPerPage={USERS_PER_PAGE}
      searchFilter={searchFilter}
    >
      <SettingsSection
        title={t('usersTitle')}
        description={t('usersDesc')}
        action={
          <div className="relative w-[280px]">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-[14px] top-1/2 size-[14px] -translate-y-1/2 text-muted-foreground" />
            <PaginatedList.Search
              placeholder={t('searchUsersPlaceholder')}
              className="h-[38px] rounded-sm border-control-border bg-input-surface px-[14px] pl-9 text-sm leading-4 placeholder:text-muted-foreground"
            />
          </div>
        }
      >
        <UsersTable refetch={refetch} />
      </SettingsSection>
    </PaginatedList>
  );
});

export { Users };
