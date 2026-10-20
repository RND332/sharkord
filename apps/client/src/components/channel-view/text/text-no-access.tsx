import { LockClosedIcon } from '@heroicons/react/24/outline';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const TextNoAccess = memo(() => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <LockClosedIcon className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{t('noChannelAccessTitle')}</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {t('noChannelAccessDescription')}
      </p>
    </div>
  );
});

export { TextNoAccess };
