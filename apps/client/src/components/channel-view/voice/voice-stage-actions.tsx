import { useScreenViewers } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import {
  PinnedCardType,
  usePinCardController
} from './hooks/use-pin-card-controller';
import { StreamViewersList } from './stream-viewers-list';
import { VoiceChatButton } from './voice-chat-button';

type TVoiceStageActionsProps = {
  channelId: number;
  isActive: boolean;
};

const VoiceStageActions = memo(
  ({ channelId, isActive }: TVoiceStageActionsProps) => {
    const { pinnedCard } = usePinCardController();
    const screenViewers = useScreenViewers(channelId);

    // The viewers list belongs to the demo that fills the stage. A minified
    // demo shows no list at all.
    const viewerIds = useMemo(() => {
      if (!pinnedCard || pinnedCard.type !== PinnedCardType.SCREEN_SHARE) {
        return undefined;
      }

      return screenViewers[pinnedCard.userId]?.viewerIds ?? [];
    }, [pinnedCard, screenViewers]);

    return (
      <div
        className={cn(
          'absolute right-3 top-3 z-10 flex items-center gap-2 transition-opacity duration-200 focus-within:pointer-events-auto focus-within:opacity-100',
          isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {viewerIds && <StreamViewersList viewerIds={viewerIds} />}
        <VoiceChatButton channelId={channelId} />
      </div>
    );
  }
);

VoiceStageActions.displayName = 'VoiceStageActions';

export { VoiceStageActions };
