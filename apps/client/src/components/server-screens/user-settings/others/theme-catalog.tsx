import { OMP_THEMES } from '@/components/theme-provider/themes';
import { Button, Input } from '@sharkord/ui';
import { memo, useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeCard } from './theme-card';

const FEATURED_IDS = [
  'omp-titanium',
  'omp-dark-catppuccin',
  'omp-dark-tokyo-night',
  'omp-dark-nord',
  'omp-light',
  'omp-light-github',
  'omp-light-catppuccin',
  'omp-alabaster'
];

type TThemeCatalogProps = {
  selectedId: string;
  onPreview: (id: string) => void;
};

export const ThemeCatalog = memo(
  ({ selectedId, onPreview }: TThemeCatalogProps) => {
    const { t } = useTranslation('settings');
    const [showAll, setShowAll] = useState(false);
    const [query, setQuery] = useState('');
    const [brightness, setBrightness] = useState('all');
    const toggleCatalog = useCallback(() => {
      setShowAll((current) => !current);
      setQuery('');
      setBrightness('all');
    }, []);
    const handleQuery = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
      []
    );
    const handleBrightness = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) =>
        setBrightness(event.target.value),
      []
    );
    const filtered = useMemo(() => {
      if (!showAll)
        return FEATURED_IDS.map((id) =>
          OMP_THEMES.find((item) => item.id === id)!
        );
      const normalized = query.trim().toLowerCase();
      return OMP_THEMES.filter((item) => {
        if (brightness !== 'all' && item.mode !== brightness) return false;
        return (
          item.name.toLowerCase().includes(normalized) ||
          item.id.includes(normalized)
        );
      });
    }, [brightness, query, showAll]);
    return (
      <section className="space-y-3" aria-label={t('ompThemesLabel')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold">Oh My Pi</h4>
          <Button
            variant="link"
            className="h-auto p-0 text-accent-text"
            onClick={toggleCatalog}
          >
            {showAll
              ? t('showFeaturedThemes')
              : t('browseAllThemes', { count: OMP_THEMES.length })}
          </Button>
        </div>
        {showAll && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label={t('searchThemes')}
              placeholder={t('searchThemes')}
              value={query}
              onChange={handleQuery}
              className="flex-1"
            />
            <select
              aria-label={t('themeBrightness')}
              value={brightness}
              onChange={handleBrightness}
              className="h-9 rounded-lg border border-control-border bg-input-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">{t('allThemes')}</option>
              <option value="dark">{t('darkThemes')}</option>
              <option value="light">{t('lightThemes')}</option>
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {filtered.map((item) => (
            <ThemeCard
              key={item.id}
              theme={item}
              selected={selectedId === item.id}
              onPreview={onPreview}
            />
          ))}
        </div>
        {showAll && (
          <p className="text-xs text-muted-foreground" role="status">
            {t('themeResults', {
              count: filtered.length,
              total: OMP_THEMES.length
            })}
          </p>
        )}
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
