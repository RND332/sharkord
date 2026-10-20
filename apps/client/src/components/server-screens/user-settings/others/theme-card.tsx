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
          'flex h-full w-full min-w-0 flex-col gap-2 rounded-lg border border-line bg-nav p-2 text-left outline-none hover:border-control-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          selected && 'border-accent-text ring-1 ring-accent-text'
        )}
      >
        <svg
          viewBox="0 0 220 90"
          className="w-full shrink-0 rounded-md"
          aria-hidden="true"
        >
          <rect width="220" height="90" fill={theme.bg} />
          <rect width="26" height="90" fill={theme.nav} />
          <rect x="26" width="44" height="90" fill={theme.panel} />
          <rect x="32" y="14" width="27" height="4" rx="2" fill={theme.muted} />
          <rect
            x="32"
            y="25"
            width="30"
            height="4"
            rx="2"
            fill={theme.accent}
          />
          <rect x="82" y="16" width="60" height="5" rx="2" fill={theme.fg} />
          <rect
            x="82"
            y="30"
            width="111"
            height="4"
            rx="2"
            fill={theme.muted}
          />
          <rect x="82" y="43" width="86" height="4" rx="2" fill={theme.muted} />
          <rect
            x="82"
            y="59"
            width="48"
            height="13"
            rx="3"
            fill={theme.accent}
          />
        </svg>
        <span className="flex min-w-0 flex-1 flex-col gap-2 px-1 pb-1">
          <span className="flex items-center justify-between gap-2 text-[13px] font-medium">
            {theme.name}
            {selected && (
              <CheckIcon className="size-4 shrink-0 text-accent-text" />
            )}
          </span>
        </span>
      </button>
    );
  }
);
