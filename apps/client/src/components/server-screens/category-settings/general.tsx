import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminCategoryGeneral } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Input, LoadingCard } from '@sharkord/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

  const { r, values, reset } = useSettingsForm<TCategoryValues>({
    initialValues: { name: '' },
    onSave,
    successMessage: t('categoryUpdated'),
    errorMessage: t('failedUpdateCategory')
  });

  useEffect(() => {
    if (category) reset({ name: category.name });
  }, [category, reset]);

  if (loading) {
    return <LoadingCard className="h-64" />;
  }

  return (
    <SettingsSection
      title={values.name || category?.name || t('categoryInfoTitle')}
      description={t('categoryInfoDesc')}
    >
      <div className="flex w-full max-w-[880px] flex-col gap-[7px]">
        <label
          className="text-sm font-semibold leading-[18px] text-foreground"
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
    </SettingsSection>
  );
});

export { General };
