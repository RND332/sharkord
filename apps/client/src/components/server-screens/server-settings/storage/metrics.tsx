import type { TDiskMetrics } from '@sharkord/shared';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface DiskMetricsProps {
  diskMetrics?: TDiskMetrics;
  pluginDataUsed?: number;
}

const DiskMetrics = memo(
  ({ diskMetrics, pluginDataUsed }: DiskMetricsProps) => {
    const { t } = useTranslation('settings');

    const totalSpace = diskMetrics?.totalSpace ?? 0;
    const usedSpace = diskMetrics?.usedSpace ?? 0;
    const freeSpace = diskMetrics?.freeSpace ?? 0;
    const sharkordUsedSpace = diskMetrics?.sharkordUsedSpace ?? 0;

    // without a capacity the numbers are unknown, not zero
    const hasCapacity = totalSpace > 0;
    const usedPercent = hasCapacity
      ? Math.min((usedSpace / totalSpace) * 100, 100)
      : 0;

    return (
      <div className="flex w-full max-w-[1040px] flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm leading-[18px] text-foreground">
            {t('diskUsage')}
          </span>
          <span className="text-sm leading-[18px] text-foreground">
            {hasCapacity ? (
              <>
                {filesize(usedSpace, { standard: 'jedec' })} of{' '}
                {filesize(totalSpace, { standard: 'jedec' })}
              </>
            ) : (
              t('diskMetricsUnavailable')
            )}
          </span>
        </div>

        {hasCapacity && (
          <div
            className="h-2 w-full overflow-hidden rounded-[4px] bg-raised"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedPercent)}
          >
            <div
              className="h-2 rounded-sm bg-primary transition-[width] duration-300"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        )}

        {hasCapacity && (
          <div className="text-xs leading-4 text-muted-foreground">
            {t('diskAvailableSpace')}{' '}
            {filesize(freeSpace, { standard: 'jedec' })}
            {' · '}
            {t('diskSharkordUsed')}{' '}
            {filesize(sharkordUsedSpace, { standard: 'jedec' })}
            {' · '}
            {t('diskSystemUsed')} {filesize(usedSpace, { standard: 'jedec' })}
            {pluginDataUsed ? (
              <>
                {' · '}
                {t('diskPluginData')}{' '}
                {filesize(pluginDataUsed, { standard: 'jedec' })}
              </>
            ) : null}
          </div>
        )}
      </div>
    );
  }
);

DiskMetrics.displayName = 'DiskMetrics';

export { DiskMetrics };
