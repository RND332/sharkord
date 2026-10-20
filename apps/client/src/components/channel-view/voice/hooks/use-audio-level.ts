import { useOwnVoiceUser } from '@/features/server/hooks';
import { useEffect, useRef, useState } from 'react';

const ANALYZER_FFT_SIZE = 512;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = -10;
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0.85;
const SPEAKING_THRESHOLD = 8;

// Chrome caps the number of live AudioContexts per page, so every participant
// would starve the others once the call grows. One shared context analyses all
// streams, and each stream keeps its own analyser.
let sharedAudioContext: AudioContext | null = null;
let sharedAudioContextRefCount = 0;

const getSharedAudioContext = (): AudioContext | null => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    sharedAudioContext = new AudioContextClass();
    sharedAudioContextRefCount = 0;
  }

  sharedAudioContextRefCount += 1;

  return sharedAudioContext;
};

const releaseSharedAudioContext = () => {
  sharedAudioContextRefCount -= 1;

  if (sharedAudioContextRefCount > 0) return;

  sharedAudioContext?.close();
  sharedAudioContext = null;
  sharedAudioContextRefCount = 0;
};

const useAudioLevel = (audioStream: MediaStream | undefined) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const ownVoiceUser = useOwnVoiceUser();

  useEffect(() => {
    if (!audioStream || ownVoiceUser?.state.soundMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioContext = getSharedAudioContext();

    if (!audioContext) {
      console.warn('Audio level detection not supported:');
      return;
    }

    let analyser: AnalyserNode;
    let source: MediaStreamAudioSourceNode;

    try {
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = ANALYZER_FFT_SIZE;
      analyser.minDecibels = ANALYZER_MIN_DECIBELS;
      analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
      analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

      source.connect(analyser);
    } catch (error) {
      console.warn('Audio level detection not supported:', error);
      releaseSharedAudioContext();
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // calculate rms (root mean square) of the frequency data
      let sum = 0;

      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }

      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(100, (rms / 255) * 100);

      setIsSpeaking(normalizedLevel > SPEAKING_THRESHOLD);

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      source.disconnect();
      analyser.disconnect();
      releaseSharedAudioContext();

      setIsSpeaking(false);
    };
  }, [audioStream, ownVoiceUser?.state.soundMuted]);

  return { isSpeaking };
};

export { useAudioLevel };
