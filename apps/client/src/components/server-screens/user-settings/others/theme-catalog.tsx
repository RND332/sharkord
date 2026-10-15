import { THEMES } from '@/components/theme-provider/themes';
import { Input } from '@sharkord/ui';
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
        <Input
          aria-label={t('searchThemes')}
          placeholder={t('searchThemes')}
          value={query}
          onChange={handleQuery}
        />
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
        <p className="text-xs text-muted-foreground" role="status">
          {t('themeResults', { count: filtered.length, total: THEMES.length })}
        </p>
        {filtered.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            {t('noThemesFound')}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t('themePaletteSource')}{' '}
          <a
            className="text-accent-text underline"
            href="https://github.com/can1357/oh-my-pi/tree/c2cb79e4c227aa4b22c4ccb933ff72fd88bceba4/packages/tui/src/theme"
            target="_blank"
            rel="noreferrer"
          >
            Oh My Pi
          </a>
          {' · '}
          <a
            className="text-accent-text underline"
            href="/licenses/oh-my-pi.txt"
            target="_blank"
            rel="noreferrer"
          >
            {t('themeLicense')}
          </a>
        </p>
      </section>
    );
  }
);
