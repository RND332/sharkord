import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { ServerScreen } from '@/components/server-screens/screens';
import { openServerScreen } from '@/features/server-screens/actions';
import { cn } from '@/lib/utils';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider
} from '@sharkord/ui';
import { ChevronUp, Settings } from 'lucide-react';
import { memo, useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TAudioSettingsMenuProps = {
  kind: 'microphone' | 'output';
  compact?: boolean;
};

const AudioSettingsMenu = memo(
  ({ kind, compact = false }: TAudioSettingsMenuProps) => {
    const { t } = useTranslation('audio');
    const { t: settingsT } = useTranslation('settings');
    const { devices, inputDevices, playbackDevices, saveDevices } =
      useDevices();
    const [open, setOpen] = useState(false);
    const volumeLabelId = useId();
    const isMicrophone = kind === 'microphone';
    const deviceKey = isMicrophone ? 'microphoneId' : 'playbackId';
    const volumeKey = isMicrophone ? 'microphoneVolume' : 'playbackVolume';
    const availableDevices = isMicrophone ? inputDevices : playbackDevices;
    const volumeLabel = t(isMicrophone ? 'microphoneVolume' : 'outputVolume');
    const defaultLabel = settingsT(
      isMicrophone ? 'defaultMicrophone' : 'defaultOutput'
    );
    const hasDefault = availableDevices.some(
      (device) => device?.deviceId === 'default'
    );

    const handleDeviceChange = useCallback(
      (value: string) => {
        saveDevices((current) => ({ ...current, [deviceKey]: value }));
      },
      [deviceKey, saveDevices]
    );
    const handleVolumeChange = useCallback(
      ([value]: number[]) => {
        saveDevices((current) => ({ ...current, [volumeKey]: value }));
      },
      [volumeKey, saveDevices]
    );
    const handleVoiceSettings = useCallback(() => {
      setOpen(false);
      openServerScreen(ServerScreen.USER_SETTINGS, {
        initialEntryId: 'devices'
      });
    }, []);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'shrink-0 rounded-md p-0 text-muted-foreground hover:bg-raised hover:text-foreground',
              compact ? 'h-7 w-4' : 'h-11 w-5'
            )}
            aria-label={t(
              isMicrophone ? 'microphoneSettings' : 'outputSettings'
            )}
          >
            <ChevronUp className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[296px] rounded-[12px] border-line bg-panel p-2 text-foreground shadow-lg"
        >
          <div>
            <Select
              value={devices[deviceKey] ?? 'default'}
              onValueChange={handleDeviceChange}
            >
              <SelectTrigger
                aria-label={t(isMicrophone ? 'inputDevice' : 'outputDevice')}
                className="h-auto w-full gap-3 rounded-lg border-0 bg-transparent p-4 text-left shadow-none hover:bg-raised [&>svg]:-rotate-90"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium leading-5">
                    {t(isMicrophone ? 'inputDevice' : 'outputDevice')}
                  </span>
                  <span className="text-[13px] leading-[18px] text-muted-foreground">
                    <SelectValue placeholder={defaultLabel} />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {!hasDefault && (
                  <SelectItem value="default">{defaultLabel}</SelectItem>
                )}
                {availableDevices.map(
                  (device) =>
                    device &&
                    device.deviceId && (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label.trim() || defaultLabel}
                      </SelectItem>
                    )
                )}
              </SelectContent>
            </Select>
          </div>
          <Separator className="bg-line" />
          <div className="flex flex-col gap-3.5 px-4 py-5">
            <div className="flex items-center justify-between gap-3 text-sm leading-5">
              <span id={volumeLabelId}>{volumeLabel}</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {devices[volumeKey]}%
              </span>
            </div>
            <Slider
              aria-label={volumeLabel}
              aria-labelledby={volumeLabelId}
              min={0}
              max={100}
              step={1}
              value={[devices[volumeKey]]}
              onValueChange={handleVolumeChange}
              className="h-5 [&_[data-slot=slider-track]]:h-1"
            />
          </div>
          <Separator className="bg-line" />
          <Button
            variant="ghost"
            onClick={handleVoiceSettings}
            className="h-auto w-full justify-start gap-3 rounded-lg p-4 text-sm font-normal"
          >
            <Settings className="size-4 shrink-0 text-muted-foreground" />
            {t('voiceSettings')}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
);

export { AudioSettingsMenu };
