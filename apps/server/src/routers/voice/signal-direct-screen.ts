import {
  ChannelPermission,
  DIRECT_SCREEN_SDP_MAX_LENGTH,
  Permission
} from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { channelUserCan } from '../../db/queries/channels';
import { getDirectScreenRuntime } from '../../helpers/get-direct-screen-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// native WebRTC validates SDP mechanics; the server only bounds and limits its media surface.
const sdp = z
  .string()
  .min(1)
  .max(DIRECT_SCREEN_SDP_MAX_LENGTH)
  .refine(
    (value) =>
      /^v=0(?:\r?\n)/.test(value) &&
      !/^m=(?!audio(?:\s)|video(?:\s))/m.test(value),
    'Invalid direct screen SDP'
  );

const signalDirectScreenRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.voiceStream.maxRequests,
  windowMs: config.rateLimiters.voiceStream.windowMs,
  logLabel: 'signalDirectScreen'
})
  .input(
    z.strictObject({
      sessionId: z.uuid(),
      signal: z.discriminatedUnion('type', [
        z.strictObject({ type: z.literal('offer'), sdp }),
        z.strictObject({ type: z.literal('answer'), sdp }),
        z.strictObject({ type: z.literal('ready') }),
        z.strictObject({ type: z.literal('fallback') }),
        z.strictObject({ type: z.literal('stop') })
      ])
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);
    const offering = input.signal.type === 'offer';
    if (offering) await ctx.needsPermission(Permission.SHARE_SCREEN);
    const runtime = ctx.currentVoiceChannelId
      ? VoiceRuntime.findById(ctx.currentVoiceChannelId)
      : undefined;
    const session = runtime?.getDirectScreenSession(
      input.sessionId,
      ctx.user.id
    );
    const terminal =
      input.signal.type === 'fallback' || input.signal.type === 'stop';
    if (terminal && !session) {
      // missing sessions return no metadata, even after leaving or runtime destruction.
      return;
    }
    invariant(session, {
      code: 'NOT_FOUND',
      message: 'Direct screen session not found'
    });
    const current = await getDirectScreenRuntime(ctx, offering);
    const peerId =
      session.senderId === ctx.user.id ? session.peerId : session.senderId;
    if (
      !terminal &&
      !(await channelUserCan(
        current.channelId,
        peerId,
        ChannelPermission.VIEW_CHANNEL
      ))
    ) {
      current.runtime.invalidateDirectScreenUser(peerId);
      invariant(false, {
        code: 'NOT_FOUND',
        message: 'Direct screen session not found'
      });
    }
    invariant(
      current.runtime === runtime &&
        ctx.currentVoiceChannelId === current.channelId &&
        VoiceRuntime.findById(current.channelId) === runtime,
      {
        code: 'NOT_FOUND',
        message: 'Direct screen session not found'
      }
    );
    current.runtime.signalDirectScreen(
      input.sessionId,
      ctx.user.id,
      input.signal
    );
  });

export { signalDirectScreenRoute };
