import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import type { TExternalStreamTracks } from '@dodecagon/shared';
import { HeadphonesIcon, Tooltip } from '@dodecagon/ui';
import {
  ServerStackIcon,
  SpeakerXMarkIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StreamContextMenu } from './stream-context-menu';

type TExternalStreamProps = {
  title: string;
  tracks?: TExternalStreamTracks;
  pluginId?: string;
  streamKey?: string;
  avatarUrl?: string;
  isOwnChannel?: boolean;
};

const ExternalStream = memo(
  ({
    title,
    tracks,
    pluginId,
    streamKey,
    avatarUrl,
    isOwnChannel = false
  }: TExternalStreamProps) => {
    const { t } = useTranslation('sidebar');
    const hasVideo = tracks?.video;
    const hasAudio = tracks?.audio;

    const { isMuted } = useStreamVolumeControl({
      type: 'external',
      pluginId: pluginId ?? '',
      streamKey: streamKey ?? ''
    });
    const shouldShowMuteIndicator = isOwnChannel && isMuted;

    const row = (
      <div className="flex h-[30px] items-center gap-2 pl-[38px] pr-2.5 rounded hover:bg-accent/30 text-sm">
        <Tooltip
          content={
            pluginId
              ? t('externalStreamPlugin', { pluginId })
              : t('externalStream')
          }
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={title}
              className="size-[18px] shrink-0 rounded object-cover"
            />
          ) : (
            <ServerStackIcon className="size-[18px] shrink-0 text-muted-foreground opacity-60" />
          )}
        </Tooltip>

        <span className="flex-1 text-muted-foreground truncate text-xs">
          {title}
        </span>

        <div className="flex items-center gap-1 opacity-60">
          {shouldShowMuteIndicator && (
            <SpeakerXMarkIcon className="h-3 w-3 text-red-500" />
          )}
          {hasVideo && <VideoCameraIcon className="h-3 w-3 text-blue-500" />}
          {hasAudio && <HeadphonesIcon className="h-3 w-3 text-green-500" />}
        </div>
      </div>
    );

    if (!isOwnChannel || !pluginId || !streamKey) {
      return row;
    }

    return (
      <StreamContextMenu
        type="external"
        pluginId={pluginId}
        streamKey={streamKey}
        title={title}
        avatarUrl={avatarUrl}
      >
        {row}
      </StreamContextMenu>
    );
  }
);

export { ExternalStream };
