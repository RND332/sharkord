import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@sharkord/ui';
import {
  Maximize,
  Minimize,
  Monitor,
  MonitorOff,
  PictureInPicture2,
  Pin,
  PinOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { memo, useRef, type ReactNode, type RefObject } from 'react';
import { usePictureInPicture } from './hooks/use-picture-in-picture';

type TVoiceCardContextMenuProps = {
  children: ReactNode;
  volumeKey?: TVolumeKey;
  pinControl?: {
    isPinned: boolean;
    onToggle: () => void;
  };
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
};

const VoiceCardContextMenu = memo(
  ({
    children,
    volumeKey,
    pinControl,
    pictureInPicture,
    fullscreen,
    zoom,
    webcam,
    demo
  }: TVoiceCardContextMenuProps) => {
    const { getVolume, toggleMute } = useVolumeControl();
    const fallbackVideoRef = useRef<HTMLVideoElement>(null);
    const { isSupported, isActive, togglePictureInPicture } =
      usePictureInPicture(
        pictureInPicture?.videoRef ?? fallbackVideoRef,
        !!pictureInPicture
      );

    const isMuted = volumeKey !== undefined && getVolume(volumeKey) === 0;
    const showPip = !!pictureInPicture && isSupported;

    const hasItems =
      volumeKey !== undefined ||
      !!pinControl ||
      showPip ||
      !!fullscreen ||
      !!zoom ||
      !!webcam ||
      !!demo;

    if (!hasItems) {
      return <>{children}</>;
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {demo && (
            <ContextMenuItem onSelect={demo.onToggle}>
              {demo.isViewing ? <MonitorOff /> : <Monitor />}
              {demo.isViewing ? 'Stop viewing demo' : 'Watch stream'}
            </ContextMenuItem>
          )}
          {pinControl && (
            <ContextMenuItem onSelect={pinControl.onToggle}>
              {pinControl.isPinned ? <PinOff /> : <Pin />}
              {pinControl.isPinned ? 'Unpin' : 'Pin'}
            </ContextMenuItem>
          )}
          {zoom && (
            <ContextMenuItem onSelect={zoom.onToggle}>
              {zoom.isEnabled ? <ZoomOut /> : <ZoomIn />}
              {zoom.isEnabled ? 'Disable zoom' : 'Enable zoom'}
            </ContextMenuItem>
          )}
          {webcam && (
            <ContextMenuItem onSelect={webcam.onToggle}>
              {webcam.isHidden ? <Video /> : <VideoOff />}
              {webcam.isHidden ? 'Show webcam' : 'Hide webcam'}
            </ContextMenuItem>
          )}
          {volumeKey !== undefined && (
            <ContextMenuItem onSelect={() => toggleMute(volumeKey)}>
              {isMuted ? <VolumeX /> : <Volume2 />}
              {isMuted ? 'Unmute' : 'Mute'}
            </ContextMenuItem>
          )}
          {showPip && (
            <ContextMenuItem onSelect={togglePictureInPicture}>
              <PictureInPicture2 />
              {isActive ? 'Exit picture-in-picture' : 'Picture-in-picture'}
            </ContextMenuItem>
          )}
          {fullscreen && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={fullscreen.onToggle}>
                {fullscreen.isFullscreen ? <Minimize /> : <Maximize />}
                {fullscreen.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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
