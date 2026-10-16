import { StreamKind } from '@sharkord/shared';
import { z } from 'zod';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const resumeConsumerRoute = protectedProcedure
  .input(
    z.object({
      remoteId: z.number(),
      consumerId: z.string().min(1),
      kind: z.enum([
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.SCREEN_AUDIO,
        StreamKind.EXTERNAL_VIDEO
      ])
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, mediaGeneration } = await getCurrentVoiceRuntime(ctx);
    runtime.assertMediaAllowed(ctx.user.id, input.kind, mediaGeneration);

    const consumer = runtime.getConsumer(
      ctx.user.id,
      input.remoteId,
      input.kind
    );

    invariant(consumer && consumer.id === input.consumerId, {
      code: 'NOT_FOUND',
      message: 'Consumer not found'
    });

    if (!consumer.paused) return;

    await consumer.resume();
  });

export { resumeConsumerRoute };
