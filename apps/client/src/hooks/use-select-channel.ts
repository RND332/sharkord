import { VoiceSessionCancelledError } from '@/components/voice-provider/session-cancelled';
import { setDmsOpen } from '@/features/server/actions';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { channelByIdSelector } from '@/features/server/channels/selectors';
import { joinVoice, leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { store } from '@/features/store';
import { LocalStorageKey, setLocalStorageItem } from '@/helpers/storage';
import { ChannelType } from '@sharkord/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// the single entry point for navigating to a channel, it also joins voice and
// remembers the last text channel, so never dispatch setSelectedChannelId directly
const useSelectChannel = () => {
  const { t } = useTranslation('common');

  const { init } = useVoice();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  return useCallback(
    async (channelId: number) => {
      const state = store.getState();
      const channel = channelByIdSelector(state, channelId);

      if (!channel) return;

      setDmsOpen(false);
      setSelectedChannelId(channel.id);

      if (channel.type !== ChannelType.VOICE) {
        // persist selected channel for non-voice channels
        setLocalStorageItem(
          LocalStorageKey.LAST_SELECTED_CHANNEL,
          channel.id.toString()
        );
      }

      if (
        channel.type === ChannelType.VOICE &&
        currentVoiceChannelId !== channel.id
      ) {
        const response = await joinVoice(channel.id);

        if (!response) return;

        try {
          await init(response, channel.id);
        } catch (error) {
          if (error instanceof VoiceSessionCancelledError) return;
          await leaveVoice({ reason: 'init_failed' });

          toast.error(t('common:failedInitVoiceConnection'));
        }
      }
    },
    [currentVoiceChannelId, init, t]
  );
};

export { useSelectChannel };
