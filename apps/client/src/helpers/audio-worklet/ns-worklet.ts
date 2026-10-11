import { createDtlnChain } from '@/helpers/audio-worklet/dtln-worklet';
import { createRnnoiseChain } from '@/helpers/audio-worklet/rnnoise-worklet';
import { NoiseSuppression } from '@/types';

export type TNsChain = {
  outputTrack: MediaStreamTrack;
  contexts: AudioContext[];
};

const createNsChain = async (
  noiseSuppression: NoiseSuppression,
  stream: MediaStream,
  registerContext?: (context: AudioContext) => void
): Promise<TNsChain> => {
  switch (noiseSuppression) {
    case NoiseSuppression.DTLN:
      return createDtlnChain(stream, registerContext);
    case NoiseSuppression.RNNOISE:
      return createRnnoiseChain(stream, registerContext);
    default:
      throw new Error(`no ns chain for ${noiseSuppression}`);
  }
};

export { createNsChain };
