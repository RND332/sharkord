import {
  ChannelType,
  Permission,
  type TDirectMediaKind
} from '@dodecagon/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { channels } from '../db/schema';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';
import { assertChannelAccess } from './assert-channel-access';
import { voiceKindPermissions } from './voice-kind-permissions';

const getDirectMediaRuntime = async (ctx: Context, kind?: TDirectMediaKind) => {
  await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);
  const mediaPermission = kind ? voiceKindPermissions[kind] : undefined;
  if (mediaPermission?.server)
    await ctx.needsPermission(mediaPermission.server);
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
  if (mediaPermission)
    await ctx.needsChannelPermission(channelId, mediaPermission.channel);
  invariant(runtime.getUser(ctx.user.id), {
    code: 'BAD_REQUEST',
    message: 'User is not in this voice channel'
  });
  return { runtime, channelId };
};

export { getDirectMediaRuntime };
