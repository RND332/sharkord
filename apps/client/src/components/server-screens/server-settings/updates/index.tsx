import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useAdminUpdates } from '@/features/server/admin/hooks';
import { Button, LoadingCard } from '@sharkord/ui';
import {
  AlertCircle,
  ArrowUpCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Updates = memo(() => {
  const { t } = useTranslation('settings');
  const {
    loading,
    hasUpdate,
    latestVersion,
    currentVersion,
    canUpdate,
    update
  } = useAdminUpdates();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  let statusIcon = <CheckCircle className="size-6 text-success" />;
  let statusTitle = t('upToDateTitle');
  let statusDescription = t('upToDateDesc');
  let statusBackground = 'bg-success-solid/25';

  if (!canUpdate) {
    statusIcon = <AlertCircle className="size-6 text-destructive" />;
    statusTitle = t('updatesNotSupportedTitle');
    statusDescription = t('updatesNotSupportedDesc');
    statusBackground = 'bg-destructive/15';
  } else if (hasUpdate) {
    statusIcon = <Download className="size-6 text-accent-text" />;
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
            <ArrowUpCircle className="size-5" />
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
        </div>

        <div className="flex flex-wrap gap-[30px] border-t border-line pt-2 text-sm leading-4 text-muted-foreground">
          <span>
            {t('currentVersionLabel')}{' '}
            <span className="font-mono text-foreground">
              {currentVersion || t('unknownVersion')}
            </span>
          </span>
          <span>
            {t('latestVersionLabel')}{' '}
            <span className="font-mono text-foreground">
              {latestVersion || t('unknownVersion')}
            </span>
          </span>
        </div>
      </div>
    </SettingsSection>
  );
});

export { Updates };
