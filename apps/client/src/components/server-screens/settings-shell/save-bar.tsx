import { Button, Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TSaveBarProps = {
  isSaving: boolean;
  save: () => Promise<void>;
};

const SaveBar = memo(({ isSaving, save }: TSaveBarProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="pointer-events-none sticky bottom-5 z-20 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[730px] items-center justify-between gap-4 rounded-[10px] border border-line bg-rail px-4 py-3 shadow-2xl">
        <span className="text-sm font-semibold">{t('unsavedChanges')}</span>
        <Button onClick={save} disabled={isSaving}>
          {isSaving && <Spinner size="xxs" />}
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </div>
  );
});

export { SaveBar };
