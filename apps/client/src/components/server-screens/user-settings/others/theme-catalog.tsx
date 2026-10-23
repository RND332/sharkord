import { THEMES } from '@/components/theme-provider/themes';
import { Input } from '@dodecagon/ui';
import { memo, useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeCard } from './theme-card';

const SORTED_THEMES = [...THEMES].sort((a, b) => a.name.localeCompare(b.name));

type TThemeCatalogProps = {
  selectedId: string;
  onPreview: (id: string) => void;
};

export const ThemeCatalog = memo(
  ({ selectedId, onPreview }: TThemeCatalogProps) => {
    const { t } = useTranslation('settings');
    const [query, setQuery] = useState('');
    const handleQuery = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
      []
    );
    const filtered = useMemo(() => {
      const normalized = query.trim().toLowerCase();
      return SORTED_THEMES.filter(
        (item) =>
          item.name.toLowerCase().includes(normalized) ||
          item.id.includes(normalized)
      );
    }, [query]);
    return (
      <section className="space-y-3" aria-label={t('themesTitle')}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-foreground" role="status">
            {t('themesCount', { count: filtered.length })}
          </h3>
          <Input
            aria-label={t('searchThemes')}
            placeholder={t('searchThemes')}
            value={query}
            onChange={handleQuery}
            className="w-[320px]"
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto pr-1">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <li key={item.id} className="min-w-0">
                <ThemeCard
                  theme={item}
                  selected={selectedId === item.id}
                  onPreview={onPreview}
                />
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              {t('noThemesFound')}
            </p>
          )}
        </div>
      </section>
    );
  }
);
