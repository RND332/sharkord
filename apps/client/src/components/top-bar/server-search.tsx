import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex h-7 w-full max-w-[550px] items-center gap-2.5 rounded-md border border-line bg-nav px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-3.5" />
      <span className="truncate text-left">{t('searchContent')}</span>
      <span className="ml-auto hidden text-xs text-subtle-foreground md:inline">
        Ctrl K
      </span>
    </button>
  );
});

export { ServerSearch };
