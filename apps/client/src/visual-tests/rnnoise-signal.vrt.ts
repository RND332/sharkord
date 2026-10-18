import { createNsChain } from '@/helpers/audio-worklet/ns-worklet';
import { NoiseSuppression } from '@/types';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

for (const sampleRate of [44100, 48000]) {
  for (const inputChannel of [0, 1]) {
    test(`RNNoise preserves input ${inputChannel + 1} of a ${sampleRate} Hz stereo microphone`, async () => {
      const captureContext = new AudioContext({ sampleRate });
      const contexts: AudioContext[] = [captureContext];
      const oscillator = captureContext.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 180;
      const merger = captureContext.createChannelMerger(2);
      const captured = captureContext.createMediaStreamDestination();
      oscillator.connect(merger, 0, inputChannel);
      merger.connect(captured);
      oscillator.start();
      const start = document.createElement('button');
      start.textContent = 'Start audio';
      start.onclick = () => captureContext.resume();
      document.body.append(start);

      let outputTrack: MediaStreamTrack | undefined;

      try {
        await userEvent.click(start);
        await expect.poll(() => captureContext.state).toBe('running');
        const [inputTrack] = captured.stream.getAudioTracks();
        const inputSettings = inputTrack!.getSettings();
        expect(inputSettings.sampleRate).toBe(sampleRate);
        expect(inputSettings.channelCount).toBe(2);

        const chain = await createNsChain(
          NoiseSuppression.RNNOISE,
          captured.stream,
          (context) => contexts.push(context)
        );
        outputTrack = chain.outputTrack;
        const outputSettings = outputTrack.getSettings();
        expect(outputSettings.sampleRate).toBe(48000);
        expect(outputTrack.readyState).toBe('live');

        const [processingContext] = chain.contexts;
        const output = new MediaStream([outputTrack]);
        const source = processingContext!.createMediaStreamSource(output);
        const splitter = processingContext!.createChannelSplitter(2);
        source.connect(splitter);

        for (const outputChannel of [0, 1]) {
          const analyser = processingContext!.createAnalyser();
          splitter.connect(analyser, outputChannel);
          const samples = new Float32Array(analyser.fftSize);
          const rms = () => {
            analyser.getFloatTimeDomainData(samples);
            const energy = samples.reduce(
              (total, sample) => total + sample * sample,
              0
            );

            return Math.sqrt(energy / samples.length);
          };

          await expect.poll(rms).toBeGreaterThan(0.01);
        }
      } finally {
        oscillator.stop();
        outputTrack?.stop();
        captured.stream.getTracks().forEach((track) => track.stop());
        await Promise.all(contexts.map((context) => context.close()));
        start.remove();
      }
    });
  }
}
