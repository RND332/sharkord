import { usePaginatedList } from '@dodecagon/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

// the footer lives inside the paginated list, so it reads the page state from the list itself
// and never keeps a second copy of it
const SearchResultsFooter = memo(() => {
  const { t } = useTranslation('dialogs');
  const { currentPage, itemsPerPage, totalItems } = usePaginatedList();

  const from = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
      <span>{t('searchResultsRange', { from, to, total: totalItems })}</span>
      <span aria-hidden="true">·</span>
      <span>{t('escToClose')}</span>
    </div>
  );
});

export { SearchResultsFooter };
