import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  EyeSlashIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  Square2StackIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/outline';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Slider
} from '@sharkord/ui';
import {
  memo,
  useCallback,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject
} from 'react';
import { useTranslation } from 'react-i18next';
import { usePictureInPicture } from './hooks/use-picture-in-picture';

type TVoiceCardContextMenuProps = {
  children: ReactNode;
  volumeKey?: TVolumeKey;
  pictureInPicture?: {
    videoRef: RefObject<HTMLVideoElement | null>;
  };
  fullscreen?: {
    isFullscreen: boolean;
    onToggle: () => void;
  };
  zoom?: {
    isEnabled: boolean;
    onToggle: () => void;
  };
  webcam?: {
    isHidden: boolean;
    onToggle: () => void;
  };
  demo?: {
    isViewing: boolean;
    onToggle: () => void;
  };
  pin?: {
    isPinned: boolean;
    onToggle: () => void;
  };
};

const VoiceCardContextMenu = memo(
  ({
    children,
    volumeKey,
    pictureInPicture,
    fullscreen,
    zoom,
    webcam,
    demo,
    pin
  }: TVoiceCardContextMenuProps) => {
    const { t } = useTranslation('common');
    const { getVolume, setVolume } = useVolumeControl();
    const sliderRef = useRef<HTMLSpanElement>(null);
    const volume = volumeKey === undefined ? 100 : getVolume(volumeKey);
    const handleVolumeChange = useCallback(
      ([value]: number[]) => {
        if (volumeKey !== undefined && value !== undefined)
          setVolume(volumeKey, value);
      },
      [volumeKey, setVolume]
    );
    const handleVolumeSelect = useCallback((event: Event) => {
      event.preventDefault();
      const thumb =
        sliderRef.current?.querySelector<HTMLElement>('[role="slider"]');
      thumb?.focus();
    }, []);
    const handleSliderKeyDown = useCallback((event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Tab')
        event.stopPropagation();
    }, []);
    const handleSliderClick = useCallback((event: MouseEvent) => {
      event.stopPropagation();
    }, []);
    const fallbackVideoRef = useRef<HTMLVideoElement>(null);
    const { isSupported, isActive, togglePictureInPicture } =
      usePictureInPicture(
        pictureInPicture?.videoRef ?? fallbackVideoRef,
        !!pictureInPicture
      );

    const showPip = !!pictureInPicture && isSupported;

    const hasItems =
      volumeKey !== undefined ||
      showPip ||
      !!fullscreen ||
      !!zoom ||
      !!webcam ||
      !!demo?.isViewing ||
      !!pin;

    if (!hasItems) {
      return <>{children}</>;
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-66 rounded-[10px] border-line bg-panel p-1.5 text-foreground [&_[data-slot=context-menu-item]]:min-h-9 [&_[data-slot=context-menu-item]]:p-2">
          {demo?.isViewing && (
            <ContextMenuItem onSelect={demo.onToggle}>
              <EyeSlashIcon />
              {t('stopWatching')}
            </ContextMenuItem>
          )}
          {pin && (
            <ContextMenuItem onSelect={pin.onToggle}>
              {pin.isPinned ? <BookmarkSlashIcon /> : <BookmarkIcon />}
              {pin.isPinned ? t('unpinStream') : t('pinStream')}
            </ContextMenuItem>
          )}
          {zoom && (
            <ContextMenuItem onSelect={zoom.onToggle}>
              {zoom.isEnabled ? (
                <MagnifyingGlassMinusIcon />
              ) : (
                <MagnifyingGlassPlusIcon />
              )}
              {zoom.isEnabled ? t('disableZoom') : t('enableZoom')}
            </ContextMenuItem>
          )}
          {webcam && (
            <ContextMenuItem onSelect={webcam.onToggle}>
              {webcam.isHidden ? <VideoCameraIcon /> : <VideoCameraSlashIcon />}
              {webcam.isHidden ? t('showWebcam') : t('hideWebcam')}
            </ContextMenuItem>
          )}
          {volumeKey !== undefined && (
            <ContextMenuItem
              onSelect={handleVolumeSelect}
              className="flex-col items-stretch gap-2 focus:bg-transparent"
            >
              <div className="flex items-center justify-between leading-5">
                <span>{t('volume')}</span>
                <span className="text-[13px] text-muted-foreground">
                  {volume}%
                </span>
              </div>
              <Slider
                ref={sliderRef}
                aria-label={t('volume')}
                value={[volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                onKeyDown={handleSliderKeyDown}
                onClick={handleSliderClick}
                className="h-5 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-thumb]]:size-4"
              />
            </ContextMenuItem>
          )}
          {showPip && (
            <ContextMenuItem onSelect={togglePictureInPicture}>
              <Square2StackIcon />
              {isActive ? t('exitPictureInPicture') : t('pictureInPicture')}
            </ContextMenuItem>
          )}
          {fullscreen && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={fullscreen.onToggle}>
                {fullscreen.isFullscreen ? (
                  <ArrowsPointingInIcon />
                ) : (
                  <ArrowsPointingOutIcon />
                )}
                {fullscreen.isFullscreen
                  ? t('exitFullscreen')
                  : t('fullscreen')}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

VoiceCardContextMenu.displayName = 'VoiceCardContextMenu';

export { VoiceCardContextMenu };
