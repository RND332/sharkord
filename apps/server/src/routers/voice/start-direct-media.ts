import {
  ChannelPermission,
  DIRECT_MEDIA_KINDS,
  type TDirectMediaSession
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { channelUserCan } from '../../db/queries/channels';
import { getDirectMediaRuntime } from '../../helpers/get-direct-media-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const startDirectMediaRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'startDirectMedia'
})
  .input(z.strictObject({ kind: z.enum(DIRECT_MEDIA_KINDS) }))
  .mutation(async ({ ctx, input }): Promise<TDirectMediaSession | null> => {
    const { runtime, channelId } = await getDirectMediaRuntime(ctx, input.kind);
    const member = runtime.getUser(ctx.user.id);
    const peer = runtime
      .getState()
      .users.find((user) => user.userId !== ctx.user.id);
    if (
      !peer ||
      !(await channelUserCan(
        channelId,
        peer.userId,
        ChannelPermission.VIEW_CHANNEL
      ))
    ) {
      return null;
    }
    // async access checks must not authorize a runtime or membership that already ended.
    if (
      ctx.currentVoiceChannelId !== channelId ||
      VoiceRuntime.findById(channelId) !== runtime ||
      runtime.getUser(ctx.user.id) !== member ||
      runtime.getState().users.length !== 2 ||
      runtime.getUser(peer.userId) !== peer
    )
      return null;
    const session = runtime.startDirectMedia(ctx.user.id, input.kind);
    // direct media is optional: a null session tells the client to use relay.
    return session;
  });

export { startDirectMediaRoute };
