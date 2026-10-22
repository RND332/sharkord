import { ArrowUturnLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button, Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TSaveBarProps = {
  isSaving: boolean;
  save: () => Promise<void>;
  discard: () => void;
};

const SaveBar = memo(({ isSaving, save, discard }: TSaveBarProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="pointer-events-none sticky bottom-5 z-20 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[730px] items-center justify-between gap-3 rounded-[10px] border border-line bg-rail px-[22px] py-3 shadow-2xl">
        <span className="text-sm font-semibold">{t('unsavedChanges')}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            onClick={discard}
            disabled={isSaving}
            className="h-[38px] gap-1.5 rounded-[6px] px-3"
          >
            <ArrowUturnLeftIcon className="size-4" />
            {t('discardEdits')}
          </Button>
          <Button
            onClick={save}
            disabled={isSaving}
            className="h-[38px] gap-1.5 rounded-[6px] px-3"
          >
            {isSaving ? (
              <Spinner size="xxs" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            {isSaving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
});

export { SaveBar };
