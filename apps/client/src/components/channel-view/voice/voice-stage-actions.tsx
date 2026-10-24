import { useScreenViewers } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { UsersIcon } from '@heroicons/react/24/outline';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PinnedCardType,
  usePinCardController
} from './hooks/use-pin-card-controller';
import { StreamViewersList } from './stream-viewers-list';
import { VoiceChatButton } from './voice-chat-button';

type TVoiceStageActionsProps = {
  channelId: number;
  isActive: boolean;
  participantsHidden?: boolean;
  onToggleParticipants?: () => void;
};

// the participants toggle sits in the stage header, in the free band above the
// stage content, so it never covers the tiles
const StageParticipantsToggle = memo(
  ({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) => {
    const { t } = useTranslation('common');

    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={hidden ? t('showParticipants') : t('hideParticipants')}
        aria-pressed={hidden}
        className="flex size-8 items-center justify-center rounded-[8px] border border-line bg-nav/85 text-foreground backdrop-blur transition-colors hover:bg-nav focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <UsersIcon className="size-[18px]" />
      </button>
    );
  }
);

StageParticipantsToggle.displayName = 'StageParticipantsToggle';

const VoiceStageActions = memo(
  ({
    channelId,
    isActive,
    participantsHidden = false,
    onToggleParticipants
  }: TVoiceStageActionsProps) => {
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
          'absolute inset-x-3 top-3 z-10 flex items-start justify-between transition-opacity duration-200 focus-within:pointer-events-auto focus-within:opacity-100',
          isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {onToggleParticipants && (
          <StageParticipantsToggle
            hidden={participantsHidden}
            onToggle={onToggleParticipants}
          />
        )}
        <div className="flex items-center gap-2">
          {viewerIds && <StreamViewersList viewerIds={viewerIds} />}
          <VoiceChatButton channelId={channelId} />
        </div>
      </div>
    );
  }
);

VoiceStageActions.displayName = 'VoiceStageActions';

export { VoiceStageActions };
