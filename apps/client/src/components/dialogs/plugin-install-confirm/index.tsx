import { useCountdown } from '@/hooks/use-countdown';
import { useOnEsc } from '@/hooks/use-on-esc';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  buttonVariants
} from '@dodecagon/ui';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

const COUNTDOWN_SECONDS = 10;

type TPluginInstallConfirmDialogProps = TDialogBaseProps & {
  pluginName: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const PluginInstallConfirmDialog = memo(
  ({
    isOpen,
    pluginName,
    onConfirm,
    onCancel,
    close
  }: TPluginInstallConfirmDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { countdown } = useCountdown({
      seconds: COUNTDOWN_SECONDS,
      isActive: isOpen
    });

    useOnEsc(close);

    const handleCancel = useCallback(() => {
      onCancel?.();
      close();
    }, [onCancel, close]);

    const handleConfirm = useCallback(() => {
      if (countdown > 0) return;
      onConfirm?.();
      close();
    }, [countdown, onConfirm, close]);

    const handleInteractOutside = useCallback((event: Event) => {
      event.preventDefault();
    }, []);

    const canConfirm = countdown === 0;

    return (
      <Dialog open={isOpen}>
        <DialogContent
          close={close}
          onInteractOutside={handleInteractOutside}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0"
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-5 pr-14">
            <DialogTitle>
              {t('pluginInstallConfirmTitle', { name: pluginName })}
            </DialogTitle>
            <DialogDescription>
              {t('pluginInstallConfirmSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-[22px] overflow-y-auto p-6">
            <div className="flex items-center gap-3.5">
              <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[10px] bg-raised">
                <Cog6ToothIcon className="size-6 text-accent-text" />
              </div>
              <span className="text-[16px] font-bold leading-5 text-foreground">
                {pluginName}
              </span>
            </div>

            <p className="text-[13px] leading-5 text-muted-foreground">
              {t('pluginInstallConfirmLead')}
            </p>

            <span className="text-[13px] font-bold leading-4 uppercase tracking-[0.07em] text-subtle-foreground">
              {t('pluginInstallWarningLabel')}
            </span>

            <ul className="flex flex-col gap-1 text-[14px] leading-[25px] text-foreground">
              <li>
                {t('pluginInstallWarningLine1')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight1')}
                </span>
                .
              </li>
              <li>
                {t('pluginInstallWarningLine2')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight2')}
                </span>
                .
              </li>
              <li>
                {t('pluginInstallWarningLine3')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight3')}
                </span>
                .
              </li>
            </ul>

            <div className="flex flex-col gap-2">
              <p className="text-[13px] leading-5 text-muted-foreground">
                {t('pluginInstallUseDocker')}
              </p>

              <p className="text-[13px] leading-5 text-muted-foreground">
                {t('pluginInstallDocsNote')}{' '}
                <a
                  href="https://sharkord.com/docs/plugins/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-colors hover:text-accent-text"
                >
                  https://sharkord.com/docs/plugins/security
                </a>
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2.5 sm:mx-0 sm:mb-0">
            <Button variant="secondary" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {canConfirm
                ? t('pluginInstallConfirmBtn')
                : t('pluginInstallConfirmCountdown', { seconds: countdown })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { PluginInstallConfirmDialog };
