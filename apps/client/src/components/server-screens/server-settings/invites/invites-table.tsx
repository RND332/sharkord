import type { TJoinedInvite } from '@sharkord/shared';
import { PaginatedList } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TableInvite } from './table-invite';

type TInvitesTableProps = {
  refetch: () => void;
};

const InvitesTable = memo(({ refetch }: TInvitesTableProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="w-full max-w-[1040px]">
      <div className="flex items-center border-b border-line py-[10px] text-[12px] uppercase leading-4 tracking-[0.07em] text-subtle-foreground">
        <div className="min-w-0 flex-1 basis-0">{t('invitesLinkCol')}</div>
        <div className="w-[180px] shrink-0">{t('invitesRoleCol')}</div>
        <div className="w-[160px] shrink-0">{t('invitesExpiresCol')}</div>
        <div className="w-[120px] shrink-0">{t('invitesUsesCol')}</div>
        <div className="w-[50px] shrink-0" />
      </div>

      <PaginatedList.List<TJoinedInvite>
        className="divide-y divide-line"
        getItemKey={(invite) => invite.id}
      >
        {(invite) => <TableInvite invite={invite} refetch={refetch} />}
      </PaginatedList.List>

      <PaginatedList.Empty className="py-8 text-center text-sm text-muted-foreground">
        {t('noInvitesFound')}
      </PaginatedList.Empty>

      <div className="flex items-center justify-between pt-4">
        <PaginatedList.Info className="text-xs text-muted-foreground" />
        <PaginatedList.Pagination />
      </div>
    </div>
  );
});

export { InvitesTable };
