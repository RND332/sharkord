import type { TTheme } from '@/components/theme-provider/themes';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TThemeCardProps = {
  theme: TTheme;
  selected: boolean;
  onPreview: (id: string) => void;
};

export const ThemeCard = memo(
  ({ theme, selected, onPreview }: TThemeCardProps) => {
    const { t } = useTranslation('settings');
    const handlePreview = useCallback(
      () => onPreview(theme.id),
      [onPreview, theme.id]
    );
    return (
      <button
        type="button"
        aria-label={t('previewTheme', { name: theme.name })}
        aria-pressed={selected}
        onClick={handlePreview}
        className={cn(
          'flex h-full w-full min-w-0 flex-col gap-2 rounded-md border border-line bg-nav p-2 text-left outline-none hover:border-control-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          selected && 'border-accent-text ring-1 ring-accent-text'
        )}
      >
        <svg
          viewBox="0 0 262 82"
          className="h-[82px] w-full shrink-0 rounded-md"
          aria-hidden="true"
        >
          <rect width="262" height="82" fill={theme.bg} />
          <rect width="26" height="82" fill={theme.nav} />
          <rect x="26" width="44" height="82" fill={theme.panel} />
          <rect x="32" y="9" width="24" height="4" rx="2" fill={theme.muted} />
          <rect
            x="32"
            y="20"
            width="30"
            height="4"
            rx="2"
            fill={theme.accent}
          />
          <rect x="80" y="12" width="52" height="5" rx="3" fill={theme.fg} />
          <rect x="80" y="25" width="85" height="4" rx="3" fill={theme.muted} />
          <rect x="80" y="37" width="65" height="4" rx="3" fill={theme.muted} />
          <rect
            x="80"
            y="49"
            width="45"
            height="12"
            rx="3"
            fill={theme.accent}
          />
        </svg>
        <span className="flex min-w-0 items-center justify-between gap-2 px-1 text-sm font-medium">
          <span className="min-w-0 truncate">{theme.name}</span>
          {selected && (
            <CheckIcon className="size-4 shrink-0 text-accent-text" />
          )}
        </span>
      </button>
    );
  }
);
