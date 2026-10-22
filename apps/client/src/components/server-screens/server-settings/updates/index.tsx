import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useAdminUpdates } from '@/features/server/admin/hooks';
import { cn } from '@/lib/utils';
import { Button, LoadingCard } from '@dodecagon/ui';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpCircleIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Updates = memo(() => {
  const { t } = useTranslation('settings');
  const {
    loading,
    hasUpdate,
    latestVersion,
    currentVersion,
    canUpdate,
    refetch,
    update
  } = useAdminUpdates();
  const [isChecking, setIsChecking] = useState(false);

  const checkAgain = useCallback(async () => {
    setIsChecking(true);

    try {
      await refetch();
    } finally {
      setIsChecking(false);
    }
  }, [refetch]);

  // a manual re-check keeps the row on screen, only the first load replaces it
  if (loading && !isChecking) {
    return <LoadingCard className="h-[600px]" />;
  }

  // the server always reports a version, so a missing one means the check
  // never came back and the real state is unknown
  const checkFailed = !currentVersion;

  let statusIcon = <CheckIcon className="size-6 text-success" />;
  let statusTitle = t('upToDateTitle');
  let statusDescription = t('upToDateDesc');
  let statusBackground = 'bg-success-solid/25';

  if (checkFailed) {
    statusIcon = <ExclamationCircleIcon className="size-6 text-destructive" />;
    statusTitle = t('updateCheckFailedTitle');
    statusDescription = t('updateCheckFailedDesc');
    statusBackground = 'bg-destructive/15';
  } else if (!canUpdate) {
    statusIcon = <ExclamationCircleIcon className="size-6 text-destructive" />;
    statusTitle = t('updatesNotSupportedTitle');
    statusDescription = t('updatesNotSupportedDesc');
    statusBackground = 'bg-destructive/15';
  } else if (hasUpdate) {
    statusIcon = <ArrowDownTrayIcon className="size-6 text-accent-text" />;
    statusTitle = t('updateAvailableTitle');
    statusDescription = t('updateAvailableDesc', { version: latestVersion });
    statusBackground = 'bg-primary/20';
  }

  return (
    <SettingsSection
      title={t('updatesTitle')}
      description={t('updatesDesc')}
      action={
        hasUpdate && canUpdate ? (
          <Button onClick={update}>
            <ArrowUpCircleIcon className="size-5" />
            {t('updateServerBtn')}
          </Button>
        ) : undefined
      }
    >
      <div className="flex w-full max-w-[1040px] flex-col gap-2">
        <div className="flex items-center gap-[15px] py-4">
          <div
            className={`flex size-[42px] shrink-0 items-center justify-center rounded-full ${statusBackground}`}
          >
            {statusIcon}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-base font-bold leading-5 text-foreground">
              {statusTitle}
            </span>
            <span className="text-sm leading-4 text-muted-foreground">
              {statusDescription}
            </span>
          </div>
          {checkFailed && (
            <div className="ml-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={checkAgain}
                disabled={isChecking}
              >
                <ArrowPathIcon
                  className={cn('size-4', isChecking && 'animate-spin')}
                />
                {t('updateCheckAgainBtn')}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-[30px] border-t border-line pt-2 text-sm leading-4 text-muted-foreground">
          <span>
            {t('currentVersionLabel')}{' '}
            <span className="font-mono">
              {currentVersion || t('unknownVersion')}
            </span>
          </span>
          <span>
            {t('latestVersionLabel')}{' '}
            <span className="font-mono">
              {latestVersion || t('unknownVersion')}
            </span>
          </span>
        </div>
      </div>
    </SettingsSection>
  );
});

export { Updates };
