import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { ServerScreen } from '@/components/server-screens/screens';
import { openServerScreen } from '@/features/server-screens/actions';
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider
} from '@dodecagon/ui';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import {
  memo,
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';

type TAudioSettingsMenuProps = {
  kind: 'microphone' | 'output';
  children: ReactNode;
};

const AudioSettingsMenu = memo(
  ({ kind, children }: TAudioSettingsMenuProps) => {
    const { t } = useTranslation('audio');
    const { t: settingsT } = useTranslation('settings');
    const { devices, inputDevices, playbackDevices, saveDevices } =
      useDevices();
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLSpanElement>(null);
    const restoreFocusRef = useRef(true);
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

    const handleContextMenu = useCallback((event: MouseEvent) => {
      event.preventDefault();
      restoreFocusRef.current = true;
      setOpen(true);
    }, []);
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      if (
        event.key === 'ContextMenu' ||
        (event.shiftKey && event.key === 'F10')
      ) {
        event.preventDefault();
        event.stopPropagation();
        restoreFocusRef.current = true;
        setOpen(true);
      }
    }, []);
    const handleCloseAutoFocus = useCallback((event: Event) => {
      event.preventDefault();
      if (restoreFocusRef.current) {
        const button = anchorRef.current?.querySelector('button');
        button?.focus();
      }
    }, []);
    const handleInteractOutside = useCallback(() => {
      restoreFocusRef.current = false;
    }, []);

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
      restoreFocusRef.current = false;
      setOpen(false);
      openServerScreen(ServerScreen.USER_SETTINGS, {
        initialEntryId: 'devices'
      });
    }, []);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <span
            ref={anchorRef}
            className="inline-flex shrink-0"
            data-state={open ? 'open' : 'closed'}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
          >
            {children}
          </span>
        </PopoverAnchor>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          onCloseAutoFocus={handleCloseAutoFocus}
          onInteractOutside={handleInteractOutside}
          aria-label={t(isMicrophone ? 'microphoneSettings' : 'outputSettings')}
          className="w-66 rounded-[10px] border-line bg-panel p-1.5 text-foreground shadow-lg"
        >
          <div>
            <Select
              value={devices[deviceKey] ?? 'default'}
              onValueChange={handleDeviceChange}
            >
              <SelectTrigger
                aria-label={t(isMicrophone ? 'inputDevice' : 'outputDevice')}
                className="h-auto w-full gap-2 rounded-md border-0 bg-transparent p-2 text-left shadow-none hover:bg-raised [&>svg]:-rotate-90"
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
          <div className="flex flex-col gap-2 p-2">
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
            className="h-auto w-full justify-start gap-2 rounded-md p-2 text-sm font-normal"
          >
            <Cog6ToothIcon className="size-4 shrink-0" />
            {t('voiceSettings')}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
);

export { AudioSettingsMenu };
