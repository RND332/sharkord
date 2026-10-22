import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from '@dodecagon/ui';
import { PlusIcon } from '@heroicons/react/24/outline';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TCreateCategoryDialogProps = TDialogBaseProps;

const CreateCategoryDialog = memo(
  ({ isOpen, close }: TCreateCategoryDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { values, r, setTrpcErrors } = useForm({
      name: 'New Category'
    });
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.categories.add.mutate({
          name: values.name
        });

        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [values.name, close, setTrpcErrors]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          onInteractOutside={close}
          close={close}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0"
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-5 pr-14">
            <DialogTitle className="text-[20px] leading-7">
              {t('createCategoryTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[19px]">
              {t('createCategoryDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-7 overflow-y-auto p-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="create-category-name"
                className="text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground"
              >
                {t('categoryNameLabel')}
              </label>
              <AutoFocus>
                <Input
                  id="create-category-name"
                  {...r('name')}
                  className="h-auto px-[15px] py-[15px] text-[15px] leading-[18px] md:text-[15px]"
                  placeholder={t('categoryNamePlaceholder')}
                  onEnter={onSubmit}
                />
              </AutoFocus>
            </div>

            <p className="text-sm leading-[21px] text-muted-foreground">
              {t('createCategoryHint')}
            </p>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end sm:mx-0 sm:mb-0">
            <Button onClick={onSubmit} disabled={loading}>
              <PlusIcon className="size-5" />
              {t('createCategoryBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateCategoryDialog };
