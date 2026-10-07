import {
  ServerEvents,
  type StreamKind,
  type TDirectScreenEvent
} from '@sharkord/shared';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import { config } from '../../config';
import { getDirectScreenRuntime } from '../../helpers/get-direct-screen-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

type TVoiceProducerEvent = {
  channelId: number;
  remoteId: number;
  kind: StreamKind;
};

// these events are broadcast to ALL users (for UI population in the sidebar)
const onUserJoinVoiceRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.USER_JOIN_VOICE);
  }
);

const onUserLeaveVoiceRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.USER_LEAVE_VOICE);
  }
);

const onUserUpdateVoiceStateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.USER_VOICE_STATE_UPDATE);
  }
);

// broadcast too: reactions render on the voice cards of whichever channel the user is
// looking at, which is not necessarily the one they are connected to
const onUserVoiceReactionRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.USER_VOICE_REACTION);
  }
);

const onUserVoiceMovedRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(ctx.user.id, ServerEvents.USER_VOICE_MOVED);
  }
);

// these events are broadcast to ALL users (for external stream UI in the sidebar)
const onVoiceAddExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.VOICE_ADD_EXTERNAL_STREAM);
  }
);

const onVoiceUpdateExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM);
  }
);

const onVoiceRemoveExternalStreamRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.VOICE_REMOVE_EXTERNAL_STREAM);
  }
);

// these events are channel-scoped (only sent to users in the same voice channel)
// they relate to actual media streaming, not UI state
const onVoiceNewProducerRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    if (!ctx.currentVoiceChannelId) {
      return observable<TVoiceProducerEvent>(() => () => {});
    }

    return ctx.pubsub.subscribeForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_NEW_PRODUCER
    );
  }
);

const onVoiceProducerClosedRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    if (!ctx.currentVoiceChannelId) {
      return observable<TVoiceProducerEvent>(() => () => {});
    }

    return ctx.pubsub.subscribeForChannel(
      ctx.currentVoiceChannelId,
      ServerEvents.VOICE_PRODUCER_CLOSED
    );
  }
);

const onDirectScreenSignalRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'onDirectScreenSignal'
})
  .input(z.strictObject({ enabled: z.boolean() }))
  .subscription(async ({ ctx, input }) => {
    const { runtime, channelId } = await getDirectScreenRuntime(ctx);
    const member = runtime.getUser(ctx.user.id);
    return observable<TDirectScreenEvent>((observer) => {
      if (
        ctx.currentVoiceChannelId !== channelId ||
        VoiceRuntime.findById(channelId) !== runtime ||
        runtime.getUser(ctx.user.id) !== member
      )
        return () => {};
      const registration = runtime.registerDirectScreenSubscriber(
        ctx.user.id,
        input.enabled
      );
      const subscription = ctx.pubsub
        .subscribeFor(ctx.user.id, ServerEvents.DIRECT_SCREEN_SIGNAL)
        .subscribe({
          next: (event) => {
            if (event.channelId !== channelId) return;
            const terminal =
              event.signal.type === 'fallback' || event.signal.type === 'stop';
            if (
              !terminal &&
              (!input.enabled ||
                !registration.isCurrent() ||
                ctx.currentVoiceChannelId !== channelId ||
                runtime.getUser(ctx.user.id) !== member)
            )
              return;
            observer.next(event);
          },
          error: (error) => observer.error(error)
        });
      return () => {
        subscription.unsubscribe();
        registration.unregister();
      };
    });
  });

export {
  onDirectScreenSignalRoute,
  onUserJoinVoiceRoute,
  onUserLeaveVoiceRoute,
  onUserUpdateVoiceStateRoute,
  onUserVoiceMovedRoute,
  onUserVoiceReactionRoute,
  onVoiceAddExternalStreamRoute,
  onVoiceNewProducerRoute,
  onVoiceProducerClosedRoute,
  onVoiceRemoveExternalStreamRoute,
  onVoiceUpdateExternalStreamRoute
};
