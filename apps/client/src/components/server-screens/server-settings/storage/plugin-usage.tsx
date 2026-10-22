import type { TPluginStorageUsage } from '@sharkord/shared';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TPluginStorageUsageProps = {
  pluginStorage: TPluginStorageUsage[];
};

const PluginStorageUsage = memo(
  ({ pluginStorage }: TPluginStorageUsageProps) => {
    const { t } = useTranslation('settings');

    if (pluginStorage.length === 0) return null;

    return (
      <div className="flex w-full max-w-[1040px] flex-col gap-1">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium leading-[18px] text-foreground">
            {t('pluginStorageTitle')}
          </span>
          <span className="text-xs leading-4 text-muted-foreground">
            {t('pluginStorageDesc')}
          </span>
        </div>

        <div className="flex flex-col">
          {pluginStorage.map((usage) => (
            <div
              key={usage.pluginId}
              className="flex items-center justify-between gap-4 border-b border-line py-[9px] last:border-b-0"
            >
              <span className="truncate font-mono text-xs leading-4 text-muted-foreground">
                {usage.pluginId}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs leading-4 text-muted-foreground">
                {!usage.installed && (
                  <span className="text-destructive">
                    {t('pluginStorageUninstalled')}
                  </span>
                )}
                <span>
                  {t('pluginStorageFiles', { count: usage.fileCount })}
                  {' · '}
                  {filesize(usage.usedSpace, { standard: 'jedec' })}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PluginStorageUsage.displayName = 'PluginStorageUsage';

export { PluginStorageUsage };
