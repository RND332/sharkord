import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  buttonVariants
} from '@dodecagon/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TConfirmActionDialogProps = TDialogBaseProps & {
  onCancel?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
};

const ConfirmActionDialog = memo(
  ({
    isOpen,
    onCancel,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'info'
  }: TConfirmActionDialogProps) => {
    const { t } = useTranslation('dialogs');

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="flex flex-col gap-0 p-0">
          <AlertDialogHeader className="px-6 pt-6 pb-5">
            <AlertDialogTitle>
              {title ?? t('confirmActionTitle')}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogDescription className="px-6 py-6 text-[15px] leading-[23px] text-foreground">
            {message ?? t('confirmActionMsg')}
          </AlertDialogDescription>

          <AlertDialogFooter className="gap-2.5 bg-nav px-6 py-4">
            <AlertDialogCancel
              onClick={onCancel}
              className="border-0 bg-raised text-foreground hover:bg-raised/80"
            >
              {cancelLabel ?? t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onConfirm}
                className={buttonVariants({
                  variant: variant === 'danger' ? 'destructive' : 'default'
                })}
              >
                {confirmLabel ?? t('confirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ConfirmActionDialog };
