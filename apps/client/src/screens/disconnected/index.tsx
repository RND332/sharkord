import { connect, setDisconnectInfo } from '@/features/server/actions';
import type { TDisconnectInfo } from '@/features/server/types';
import { getHostFromServer } from '@/helpers/get-file-url';
import { DisconnectCode } from '@dodecagon/shared';
import { Button } from '@dodecagon/ui';
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  ScaleIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TDisconnectedProps = {
  info: TDisconnectInfo;
};

const Disconnected = memo(({ info }: TDisconnectedProps) => {
  const { t, i18n } = useTranslation('disconnected');
  const host = getHostFromServer();
  const [lastAttemptAt, setLastAttemptAt] = useState(info.time);
  const [retrying, setRetrying] = useState(false);

  const disconnectType = useMemo(() => {
    const code = info.code;

    if (code === DisconnectCode.KICKED) {
      return {
        icon: <ExclamationCircleIcon className="h-8 w-8 text-yellow-500" />,
        title: t('kicked'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: true
      };
    }

    if (code === DisconnectCode.BANNED) {
      return {
        icon: <ScaleIcon className="h-8 w-8 text-red-500" />,
        title: t('banned'),
        message: info.reason || t('noReasonProvided'),
        canReconnect: false
      };
    }

    return {
      icon: <SignalSlashIcon className="h-8 w-8 text-gray-500" />,
      title: t('connectionLost'),
      message: t('lostConnectionMessage'),
      canReconnect: true
    };
  }, [info, t]);

  const handleReconnect = useCallback(async () => {
    if (retrying) return;

    setRetrying(true);
    setLastAttemptAt(new Date());

    try {
      await connect();
    } catch {
      // credentials or the server may be gone; the connect screen owns that recovery.
    } finally {
      setDisconnectInfo(undefined);
      setRetrying(false);
    }
  }, [retrying]);

  const lastAttemptText = lastAttemptAt.toLocaleTimeString(i18n.language, {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-6 py-6">
        <div className="max-w-md space-y-5 text-center">
          {disconnectType.icon && (
            <div className="flex justify-center">{disconnectType.icon}</div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {disconnectType.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {disconnectType.message}
            </p>
          </div>

          {disconnectType.canReconnect && (
            <Button
              onClick={handleReconnect}
              disabled={retrying}
              className="inline-flex items-center gap-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {t('tryAgain')}
            </Button>
          )}

          <div className="space-y-1 text-xs text-subtle-foreground">
            <p>{t('lastAttempt', { time: lastAttemptText })}</p>
            <p>{t('serverAddress', { host })}</p>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              {t('details')}
            </summary>
            <div className="mt-2 space-y-1">
              <div>{t('code', { code: info.code })}</div>
              <div>{t('time', { time: info.time.toLocaleString() })}</div>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
});

export { Disconnected };
