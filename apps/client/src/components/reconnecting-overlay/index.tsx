import { disconnectFromServer } from '@/features/server/actions';
import { useReconnectState } from '@/features/server/hooks';
import { Button } from '@sharkord/ui';
import { Loader2, WifiOff } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCountdownSeconds } from './use-countdown-seconds';

const ReconnectingOverlay = memo(() => {
  const { t } = useTranslation('common');
  const reconnect = useReconnectState();
  const secondsLeft = useCountdownSeconds(reconnect?.nextAttemptAt ?? null);

  const handleAbort = useCallback(() => disconnectFromServer(), []);

  if (!reconnect) return null;

  const isAttemptInFlight = reconnect.nextAttemptAt === null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center bg-canvas"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-5 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border border-line bg-panel">
          {isAttemptInFlight ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <WifiOff className="size-6 text-primary" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-semibold">{t('reconnectingTitle')}</p>
          <p className="text-[13px] text-muted-foreground">
            {isAttemptInFlight
              ? t('reconnectingNow')
              : t('reconnectingIn', { count: secondsLeft })}
          </p>
        </div>

        <p className="text-xs text-subtle-foreground">
          {t('reconnectingAttempt', {
            attempt: reconnect.attempt,
            total: reconnect.maxAttempts
          })}
        </p>

        <div
          className="h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-raised"
          role="presentation"
        >
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{
              width: `${(reconnect.attempt / reconnect.maxAttempts) * 100}%`
            }}
          />
        </div>

        <p className="text-xs text-subtle-foreground">
          {t('reconnectingHint')}
        </p>

        <Button variant="outline" size="sm" onClick={handleAbort}>
          {t('reconnectingAbort')}
        </Button>
      </div>
    </div>
  );
});

export { ReconnectingOverlay };
