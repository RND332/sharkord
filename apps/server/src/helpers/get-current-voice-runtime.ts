import { Permission } from '@sharkord/shared';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';

const getCurrentVoiceRuntime = async (ctx: Context) => {
  const channelId = ctx.currentVoiceChannelId;
  const runtime = channelId ? VoiceRuntime.findById(channelId) : undefined;
  const mediaGeneration = runtime?.getNonVoiceMediaGeneration(ctx.user.id);

  await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

  invariant(channelId && channelId === ctx.currentVoiceChannelId, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });

  invariant(runtime && runtime === VoiceRuntime.findById(channelId), {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Voice runtime not found for this channel'
  });

  return { runtime, channelId, mediaGeneration };
};

export { getCurrentVoiceRuntime };
