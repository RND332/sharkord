import { getTheme, type TTheme } from '@/components/theme-provider/themes';
import { useTheme } from '@/components/theme-provider/use-theme';
import { Button, Switch } from '@dodecagon/ui';
import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ThemeCatalog } from './theme-catalog';
import { ThemePreview } from './theme-preview';

type TThemePreviewToastProps = {
  theme: TTheme;
  onApply: () => void;
  onCancel: () => void;
};

export const ThemePreviewToast = memo(
  ({ theme, onApply, onCancel }: TThemePreviewToastProps) => {
    const { t } = useTranslation('settings');
    return (
      <div className="fixed bottom-6 left-1/2 z-[110] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-nav p-3 shadow-xl">
        <span className="min-w-0 text-sm" role="status">
          {t('previewingTheme', { name: theme.name })}
        </span>
        <div className="ml-auto flex shrink-0 gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={onApply}>{t('applyTheme')}</Button>
        </div>
      </div>
    );
  }
);

export const Themes = memo(() => {
  const { t } = useTranslation('settings');
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = previewId ? getTheme(previewId) : resolvedTheme;
  const handlePreview = useCallback((id: string) => setPreviewId(id), []);
  const handleCancel = useCallback(() => setPreviewId(null), []);
  const handleApply = useCallback(() => {
    setTheme(preview.id);
    setPreviewId(null);
  }, [preview.id, setTheme]);
  const handleSystemChange = useCallback(
    (enabled: boolean) => {
      setTheme(enabled ? 'system' : resolvedTheme.id);
      setPreviewId(null);
    },
    [resolvedTheme.id, setTheme]
  );
  return (
    <div className="space-y-6">
      <ThemePreview theme={preview} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm font-medium" role="status">
          {t('currentTheme', { name: resolvedTheme.name })}
        </span>
        <label className="flex items-center gap-4 text-sm text-muted-foreground">
          {t('syncSystemTheme')}
          <Switch
            checked={theme === 'system'}
            onCheckedChange={handleSystemChange}
            aria-label={t('syncSystemTheme')}
          />
        </label>
      </div>
      {previewId &&
        createPortal(
          <ThemePreviewToast
            theme={preview}
            onApply={handleApply}
            onCancel={handleCancel}
          />,
          document.body
        )}
      <ThemeCatalog selectedId={preview.id} onPreview={handlePreview} />
      <p className="text-xs text-muted-foreground">{t('themesColorsOnly')}</p>
    </div>
  );
});
