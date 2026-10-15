import { getTheme } from '@/components/theme-provider/themes';
import { useTheme } from '@/components/theme-provider/use-theme';
import { Button, Switch } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeCatalog } from './theme-catalog';
import { ThemePreview } from './theme-preview';

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
      <h3 className="text-base font-semibold">{t('themesTitle')}</h3>
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
      {previewId && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-nav p-3 shadow-sm">
          <span className="text-sm">
            {t('previewingTheme', { name: preview.name })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button onClick={handleApply}>{t('applyTheme')}</Button>
          </div>
        </div>
      )}
      <ThemeCatalog selectedId={preview.id} onPreview={handlePreview} />
      <p className="text-xs text-muted-foreground">{t('themesColorsOnly')}</p>
    </div>
  );
});
