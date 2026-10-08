import { ChannelPermission, ChannelType, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { channels } from '../db/schema';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';
import { assertChannelAccess } from './assert-channel-access';

const getDirectScreenRuntime = async (ctx: Context, sharing = false) => {
  await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);
  if (sharing) await ctx.needsPermission(Permission.SHARE_SCREEN);
  invariant(ctx.currentVoiceChannelId, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });
  const channelId = ctx.currentVoiceChannelId;
  const channel = await db
    .select({ type: channels.type, isDm: channels.isDm })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1)
    .get();
  invariant(channel, { code: 'NOT_FOUND', message: 'Channel not found' });
  invariant(channel.type === ChannelType.VOICE && !channel.isDm, {
    code: 'BAD_REQUEST',
    message: 'Channel is not a voice channel'
  });
  const runtime = VoiceRuntime.findById(channelId);
  invariant(runtime, {
    code: 'NOT_FOUND',
    message: 'Voice runtime not found for this channel'
  });
  await assertChannelAccess(ctx, channelId);
  if (sharing)
    await ctx.needsChannelPermission(channelId, ChannelPermission.SHARE_SCREEN);
  invariant(runtime.getUser(ctx.user.id), {
    code: 'BAD_REQUEST',
    message: 'User is not in this voice channel'
  });
  return { runtime, channelId };
};

export { getDirectScreenRuntime };
