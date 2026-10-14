import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { useDemoVisibility } from '@/components/voice-provider/demo-visibility-context';
import { useVoiceStats } from '@/components/voice-provider/stats-context';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { useStreamQualityData } from '@/hooks/use-stream-quality-data';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Monitor, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardTheme } from './card-theme';
import { FullscreenButton } from './fullscreen-button';
import { cardControlClass, cardControlsClass, cardDensity } from './helpers';
import { useFullscreen } from './hooks/use-fullscreen';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVideoStats } from './hooks/use-video-stats';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { ViewDemoButton } from './view-demo-button';
import { VolumeButton } from './volume-button';

type TScreenShareCardProps = {
  userId: number;
  isPinned?: boolean;
  cardId: string;
  onPin: (card: TPinnedCard) => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
  isAnyCardPinned?: boolean;
};

const ScreenShareCard = memo(
  ({
    userId,
    isPinned = false,
    cardId,
    onPin,
    onUnpin,
    className,
    showPinControls = true,
    isAnyCardPinned = false
  }: TScreenShareCardProps) => {
    const user = useUserById(userId);
    const ownUserId = useOwnUserId();
    const { devices } = useDevices();
    const { isViewingDemo, viewDemo, stopViewingDemo } = useDemoVisibility();
    const [watchState, setWatchState] = useState<'idle' | 'loading' | 'error'>(
      'idle'
    );
    const watchRequest = useRef(0);
    const automaticResume = useRef(false);
    useEffect(
      () => () => {
        watchRequest.current++;
      },
      [userId]
    );
    const handleWatch = useCallback(async () => {
      const request = ++watchRequest.current;
      automaticResume.current = false;
      setWatchState('loading');
      try {
        await viewDemo(userId);
        // Media arrival, not the RPC completing, ends the loading state.
      } catch {
        if (request !== watchRequest.current) return;
        // Roll back the provider's optimistic opt-in before offering a retry.
        try {
          await stopViewingDemo(userId);
        } catch {
          /* Still allow retry. */
        }
        if (request === watchRequest.current) setWatchState('error');
      }
    }, [viewDemo, stopViewingDemo, userId]);
    const { getUserScreenVolumeKey } = useVolumeControl();
    const isOwnUser = ownUserId === userId;
    const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
    const volumeKey = getUserScreenVolumeKey(userId);

    const isCompact = isAnyCardPinned && !isPinned;
    const density = cardDensity(isCompact);

    const {
      screenShareRef,
      screenShareAudioRef,
      hasScreenShareStream,
      hasScreenShareAudioStream
    } = useVoiceRefs(userId, undefined, isOwnUser || isViewingDemo(userId));

    const viewing = isOwnUser || isViewingDemo(userId);
    useEffect(() => {
      if (isOwnUser) return;
      if (viewing && !hasScreenShareStream && watchState === 'idle') {
        automaticResume.current = true;
        setWatchState('loading');
      } else if (!viewing && watchState === 'loading') {
        automaticResume.current = false;
        setWatchState('idle');
      }
    }, [isOwnUser, viewing, hasScreenShareStream, watchState]);
    useEffect(() => {
      if (viewing && hasScreenShareStream && watchState !== 'idle') {
        automaticResume.current = false;
        setWatchState('idle');
        return;
      }
      if (watchState !== 'loading') return;
      const timer = setTimeout(() => {
        watchRequest.current++;
        if (!automaticResume.current) {
          void stopViewingDemo(userId).catch(() => {});
        }
        setWatchState('error');
      }, 15_000);
      return () => clearTimeout(timer);
    }, [watchState, viewing, hasScreenShareStream, stopViewingDemo, userId]);

    const { getConsumerCodec } = useVoice();
    const transportStats = useVoiceStats();

    const videoStats = useVideoStats(screenShareRef, hasScreenShareStream);

    const codec = useMemo(() => {
      let mimeType: string | undefined;

      if (isOwnUser) {
        mimeType = transportStats.screenShare?.codec;
      } else {
        mimeType = getConsumerCodec(userId, StreamKind.SCREEN);
      }

      if (!mimeType) return null;

      const parts = mimeType.split('/');

      return parts.length > 1 ? parts[1] : mimeType;
    }, [
      isOwnUser,
      transportStats.screenShare?.codec,
      getConsumerCodec,
      userId
    ]);

    const { isSimulcastScreenConsumer, qualityLabel } = useStreamQualityData(
      userId,
      StreamKind.SCREEN
    );

    const {
      containerRef,
      isZoomEnabled,
      zoom,
      position,
      isDragging,
      handleToggleZoom,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      getCursor,
      resetZoom
    } = useScreenShareZoom();

    const {
      isFullscreen,
      isOverlayVisible,
      toggleFullscreen,
      handleDoubleClick
    } = useFullscreen(containerRef);

    const handleToggleFullscreen = useCallback(() => {
      resetZoom();
      toggleFullscreen();
    }, [resetZoom, toggleFullscreen]);

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
        resetZoom();
      } else {
        onPin({
          id: cardId,
          type: PinnedCardType.SCREEN_SHARE,
          userId: userId
        });
      }
    }, [isPinned, onPin, onUnpin, cardId, userId, resetZoom]);

    if (!user || devices.voiceOnlyMode) return null;

    if (!isOwnUser && (!isViewingDemo(userId) || !hasScreenShareStream)) {
      return (
        <div
          data-screen-share-card
          className={cn(
            'relative flex size-full items-center justify-center overflow-hidden rounded-[12px] border border-line bg-nav',
            className
          )}
        >
          <button
            type="button"
            onClick={handleWatch}
            disabled={watchState === 'loading'}
            aria-busy={watchState === 'loading'}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-raised px-4 text-sm font-medium leading-5 text-foreground hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Play aria-hidden="true" className="size-4" fill="currentColor" />
            {watchState === 'loading'
              ? 'Connecting…'
              : watchState === 'error'
                ? 'Retry watch stream'
                : 'Watch stream'}
          </button>
          {watchState === 'error' && (
            <p
              role="alert"
              className="absolute top-2.5 inset-x-2.5 text-center text-xs text-foreground"
            >
              Unable to watch stream. Try again.
            </p>
          )}
          <div className="absolute bottom-2.5 left-2.5 flex min-w-0 max-w-[calc(100%-20px)] items-center gap-2 text-foreground">
            <Monitor aria-hidden="true" className="size-[18px] shrink-0" />
            <p className="truncate text-[13px] font-medium leading-[17px]">
              {user.name}'s screen
            </p>
          </div>
        </div>
      );
    }

    if (!hasScreenShareStream) return null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black group/screen-share-card',
          'flex items-center justify-center',
          'size-full',
          isFullscreen
            ? 'rounded-none border-none'
            : 'rounded overflow-hidden border border-border',
          className
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isFullscreen && !isOverlayVisible ? 'none' : getCursor()
        }}
      >
        <CardTheme />

        <video
          ref={screenShareRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-x-0 top-0 h-[calc(100%-34px)] w-full bg-black object-contain"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        />

        <audio
          ref={screenShareAudioRef}
          className="hidden"
          autoPlay
          playsInline
        />

        <div
          className={cn(
            'absolute top-0 right-0 z-10 justify-end',
            density.inset,
            'hidden group-hover/screen-share-card:flex',
            'has-[[data-state=open]]:flex'
          )}
        >
          <div className={cardControlsClass(isCompact)}>
            <PictureInPictureButton
              videoRef={screenShareRef}
              size={density.icon}
              className={cardControlClass()}
            />
            {!isOwnUser && hasScreenShareAudioStream && (
              <VolumeButton
                volumeKey={volumeKey}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {!isOwnUser && webRtcSimulcastEnabled && (
              <QualityButton
                streamId={userId}
                kind={StreamKind.SCREEN}
                disabled={!isSimulcastScreenConsumer}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            <FullscreenButton
              isFullscreen={isFullscreen}
              handleToggleFullscreen={handleToggleFullscreen}
              size={density.icon}
              className={cardControlClass(isFullscreen)}
            />
            {showPinControls && isPinned && (
              <IconButton
                variant={isZoomEnabled ? 'default' : 'ghost'}
                icon={isZoomEnabled ? ZoomOut : ZoomIn}
                onClick={handleToggleZoom}
                title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
                size={density.icon}
                className={cardControlClass(isZoomEnabled)}
              />
            )}
            {showPinControls && (
              <PinButton
                isPinned={isPinned}
                handlePinToggle={handlePinToggle}
                size={density.icon}
                className={cardControlClass(isPinned)}
              />
            )}
            {!isOwnUser && (
              <ViewDemoButton
                userId={userId}
                size={density.icon}
                className={cardControlClass(true)}
              />
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex h-[34px] items-center gap-2 bg-[#050505] px-2.5">
          <Monitor className="size-[18px] shrink-0 text-white" />
          <p className="truncate text-[13px] font-medium leading-[17px] text-white">
            {user.name}'s screen
            {(videoStats || codec) && (
              <span className="ml-2 text-xs leading-4 text-muted-foreground">
                {codec}
                {codec && videoStats && ' '}
                {videoStats && (
                  <>
                    {videoStats.width}x{videoStats.height}
                    {videoStats.frameRate > 0 && ` ${videoStats.frameRate}fps`}
                  </>
                )}
                {(codec || videoStats) && qualityLabel && ' '}
                {qualityLabel && `(${qualityLabel})`}
              </span>
            )}
            {isZoomEnabled && zoom > 1 && (
              <span className="ml-2 text-xs leading-none text-white/70">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }
);

ScreenShareCard.displayName = 'ScreenShareCard';

export { ScreenShareCard };
