import {
  getThemeVariables,
  type TTheme
} from '@/components/theme-provider/themes';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export const ThemePreview = memo(({ theme }: { theme: TTheme }) => {
  const { t } = useTranslation('settings');
  const variables = getThemeVariables(theme);
  const muted = variables['--muted-foreground'] ?? theme.muted;
  const foreground = variables['--foreground'] ?? theme.fg;
  const defaultAccent = theme.mode === 'dark' ? '#aeb5ff' : '#3448bf';
  const accent = variables['--accent-text'] ?? defaultAccent;
  const messages = [
    { name: 'aria', time: '10:42', text: t('themePreviewMessageOne') },
    { name: 'rnd332', time: '10:44', text: t('themePreviewMessageTwo') }
  ];
  return (
    <div
      aria-label={t('themePreviewLabel')}
      className="overflow-hidden rounded-lg border"
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        color: foreground
      }}
    >
      <div
        className="flex min-h-10 items-center justify-between gap-4 px-4 text-sm"
        style={{ backgroundColor: theme.nav }}
      >
        <span className="font-semibold"># general</span>
        <span className="truncate text-xs" style={{ color: muted }}>
          {theme.name} · {t('themePreview')}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {messages.map((message) => (
          <div key={message.name} className="flex gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ backgroundColor: theme.panel, color: accent }}
            >
              {message.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: accent }}
                >
                  {message.name}
                </span>
                <span className="text-xs" style={{ color: muted }}>
                  {message.time}
                </span>
              </div>
              <p className="text-sm leading-6">{message.text}</p>
            </div>
          </div>
        ))}
        <div
          className="rounded-md px-3 py-2 text-[13px]"
          style={{ backgroundColor: theme.panel, color: muted }}
        >
          {t('themePreviewComposer')}
        </div>
      </div>
    </div>
  );
});
