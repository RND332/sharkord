import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminCategoryGeneral } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Button, Input, LoadingCard, Spinner } from '@sharkord/ui';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { shouldApplyCategoryValues } from './helpers';

type TGeneralProps = {
  categoryId: number;
};

type TCategoryValues = {
  name: string;
};

const General = memo(({ categoryId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { category, loading } = useAdminCategoryGeneral(categoryId);

  const onSave = useCallback(
    async (values: TCategoryValues) => {
      const trpc = getTRPCClient();

      await trpc.categories.update.mutate({ categoryId, name: values.name });
    },
    [categoryId]
  );

  const { r, values, isSaving, save, reset } = useSettingsForm<TCategoryValues>(
    {
      initialValues: { name: category?.name ?? '' },
      onSave,
      successMessage: t('categoryUpdated'),
      errorMessage: t('failedUpdateCategory')
    }
  );

  // the category is refetched after every update, the saved values are applied once per
  // category so a refetch does not drop the edits of the user before they are saved
  const initializedCategoryIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!category) return;
    if (
      !shouldApplyCategoryValues(initializedCategoryIdRef.current, category.id)
    )
      return;

    initializedCategoryIdRef.current = category.id;

    reset({ name: category.name });
  }, [category, reset]);

  if (loading) {
    return <LoadingCard className="h-64" />;
  }

  return (
    <SettingsSection
      className="max-w-[880px]"
      title={values.name || category?.name || t('categoryInfoTitle')}
      description={t('categoryInfoDesc')}
    >
      <div className="flex w-full flex-col gap-[22px]">
        <div className="flex w-full flex-col gap-[7px]">
          <label
            className="text-[13px] font-semibold leading-[18px] text-foreground"
            htmlFor="category-name"
          >
            {t('categoryNameLabel')}
          </label>
          <Input
            id="category-name"
            placeholder={t('categoryNamePlaceholder')}
            className="h-[44px] max-w-[550px] rounded-[8px] border-control-border px-[13px] text-sm"
            {...r('name')}
          />
        </div>

        <div className="flex w-full items-center pt-[8px]">
          <Button
            onClick={save}
            disabled={isSaving}
            className="h-[42px] min-w-[156px] gap-[7px] rounded-[8px] pl-[12px] pr-[14px] text-[13px] leading-[18px]"
          >
            {isSaving ? (
              <Spinner size="xxs" />
            ) : (
              <CheckIcon className="size-6" />
            )}
            {isSaving ? t('saving') : t('saveCategory')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
});

export { General };
