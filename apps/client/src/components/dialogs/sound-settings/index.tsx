import {
  setJoinLeaveSounds,
  setMuteDeafenSounds
} from '@/features/app/actions';
import { useJoinLeaveSounds, useMuteDeafenSounds } from '@/features/app/hooks';
import { CheckIcon } from '@heroicons/react/20/solid';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch
} from '@dodecagon/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TSoundSettingsDialogProps = TDialogBaseProps;

const SoundSettingsDialog = memo(
  ({ isOpen, close }: TSoundSettingsDialogProps) => {
    const { t } = useTranslation('dialogs');
    const joinLeaveSounds = useJoinLeaveSounds();
    const muteDeafenSounds = useMuteDeafenSounds();
    const [joinLeave, setJoinLeave] = useState(joinLeaveSounds);
    const [muteDeafen, setMuteDeafen] = useState(muteDeafenSounds);

    const onJoinLeaveChange = useCallback((checked: boolean) => {
      setJoinLeave(checked);
    }, []);

    const onMuteDeafenChange = useCallback((checked: boolean) => {
      setMuteDeafen(checked);
    }, []);

    const onSave = useCallback(() => {
      setJoinLeaveSounds(joinLeave);
      setMuteDeafenSounds(muteDeafen);

      toast.success(t('soundSettingsSaved'));
      close();
    }, [close, joinLeave, muteDeafen, t]);

    return (
      <Dialog open={isOpen}>
        <DialogContent close={close} className="flex flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 gap-1.5 px-6 pt-6 pb-5 pr-14">
            <DialogTitle className="text-[20px] leading-7 font-bold tracking-[-0.025em]">
              {t('soundSettingsTitle')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[19px]">
              {t('soundSettingsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] leading-[18px] text-foreground">
                {t('joinLeaveSoundsLabel')}
              </span>
              <Switch
                aria-label={t('joinLeaveSoundsLabel')}
                checked={joinLeave}
                onCheckedChange={onJoinLeaveChange}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] leading-[18px] text-foreground">
                {t('muteDeafenSoundsLabel')}
              </span>
              <Switch
                aria-label={t('muteDeafenSoundsLabel')}
                checked={muteDeafen}
                onCheckedChange={onMuteDeafenChange}
              />
            </div>

            <p className="text-[13px] leading-5 text-muted-foreground">
              {t('soundSettingsFootnote')}
            </p>
          </div>

          <DialogFooter className="shrink-0 gap-2.5 bg-nav px-6 py-4">
            <Button variant="default" onClick={onSave}>
              <CheckIcon aria-hidden="true" className="size-6" />
              {t('saveSoundSettings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { SoundSettingsDialog };
