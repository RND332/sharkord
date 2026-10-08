import { openDialog } from '@/features/dialogs/actions';
import { Search } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';

const ServerSearch = memo(() => {
  const { t } = useTranslation('topbar');
  const openSearchDialog = useCallback(() => {
    openDialog(Dialog.SEARCH);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearchDialog]);

  return (
    <button
      type="button"
      onClick={openSearchDialog}
      className="flex h-9 w-full max-w-[550px] items-center gap-2 rounded-lg border border-line bg-canvas px-3.5 text-[13px] text-muted-foreground transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
