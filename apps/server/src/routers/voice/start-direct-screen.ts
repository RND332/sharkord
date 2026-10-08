import { ChannelPermission, type TDirectScreenSession } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { channelUserCan } from '../../db/queries/channels';
import { getDirectScreenRuntime } from '../../helpers/get-direct-screen-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const startDirectScreenRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'startDirectScreen'
})
  .input(z.strictObject({}))
  .mutation(async ({ ctx }): Promise<TDirectScreenSession | null> => {
    const { runtime, channelId } = await getDirectScreenRuntime(ctx, true);
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
    return runtime.startDirectScreen(ctx.user.id);
  });

export { startDirectScreenRoute };
