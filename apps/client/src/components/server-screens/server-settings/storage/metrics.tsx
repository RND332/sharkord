import type { TDiskMetrics } from '@sharkord/shared';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface DiskMetricsProps {
  diskMetrics: TDiskMetrics;
}

const DiskMetrics = memo(({ diskMetrics }: DiskMetricsProps) => {
  const { t } = useTranslation('settings');
  const usedPercent = diskMetrics.totalSpace
    ? Math.min((diskMetrics.usedSpace / diskMetrics.totalSpace) * 100, 100)
    : 0;

  return (
    <div className="flex w-full max-w-[1040px] flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm leading-[18px] text-foreground">
          {t('diskUsage')}
        </span>
        <span className="text-sm leading-[18px] text-foreground">
          {filesize(diskMetrics.usedSpace, { standard: 'jedec' })} of{' '}
          {filesize(diskMetrics.totalSpace, { standard: 'jedec' })}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-[4px] bg-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(usedPercent)}
      >
        <div
          className="h-2 rounded-[4px] bg-primary transition-[width] duration-300"
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <div className="text-xs leading-4 text-muted-foreground">
        {t('diskAvailableSpace')}{' '}
        {filesize(diskMetrics.freeSpace, { standard: 'jedec' })}
        {' · '}
        {t('diskSharkordUsed')}{' '}
        {filesize(diskMetrics.sharkordUsedSpace, { standard: 'jedec' })}
        {' · '}
        {t('diskSystemUsed')}{' '}
        {filesize(diskMetrics.usedSpace, { standard: 'jedec' })}
      </div>
    </div>
  );
});

DiskMetrics.displayName = 'DiskMetrics';

export { DiskMetrics };
