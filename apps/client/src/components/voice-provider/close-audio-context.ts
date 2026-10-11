import { logVoiceWarn } from '@/helpers/browser-logger';

const disposedContexts = new WeakSet<AudioContext>();

// Startup cancellation and its late continuation may own the same context.
export const closeAudioContext = (context: AudioContext | null | undefined) => {
  if (!context || disposedContexts.has(context)) return;
  disposedContexts.add(context);
  const report = (error: unknown) =>
    logVoiceWarn('mic: audio context cleanup failed', { error });
  try {
    void context.close().catch(report);
  } catch (error) {
    report(error);
  }
};
