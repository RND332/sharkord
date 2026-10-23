// Renders the device settings and prints the markup. The test runs this in its
// own process: bun keeps the first mock.module registration of a path for the
// whole test run, so the mocks of the other test files would leak in.
import settingsEn from '@/i18n/locales/en/settings.json';
import type { TPublicServerSettings } from '@dodecagon/shared';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

globalThis.window =
  globalThis.window ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    location: { href: 'http://localhost' }
  } as unknown as Window & typeof globalThis);

globalThis.document =
  globalThis.document ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    head: { appendChild: noop },
    body: { appendChild: noop },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createTextNode: () => ({}),
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

// the audio worklets are loaded through the bundler, they cannot run here
mock.module('@/helpers/audio-worklet/noise-gate-worklet', () => ({
  createNoiseGateWorkletNode: noop,
  getNoiseGateWorkletAvailabilitySnapshot: () => ({
    available: true,
    reason: undefined
  }),
  markNoiseGateWorkletUnavailable: noop,
  postNoiseGateWorkletConfig: noop,
  subscribeNoiseGateWorkletAvailability: () => noop
}));
mock.module('@/helpers/audio-worklet/audio-meter-worklet', () => ({
  createAudioMeterWorkletNode: noop,
  postAudioMeterWorkletConfig: noop
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

// the panel only reads the simulcast switch, the rest of the settings stay out
const publicSettings = (process.argv[2] === 'simulcast'
  ? { webRtcSimulcastEnabled: true }
  : undefined) as unknown as TPublicServerSettings | undefined;

const { setStoreState } = await import('@/features/store');
const { serverInitialState } = await import('@/features/server/slice');

setStoreState({
  server: { ...serverInitialState, publicSettings }
});

const { DevicesProviderContext } =
  await import('@/components/devices-provider');
const { NoiseSuppression, Resolution, ScreenCursor, VideoCodec } =
  await import('@/types');
const { Devices } = await import('../index');

const devices = {
  microphoneVolume: 100,
  playbackVolume: 100,
  microphoneId: undefined,
  playbackId: undefined,
  webcamId: undefined,
  webcamResolution: Resolution['720p'],
  webcamFramerate: 30,
  echoCancellation: true,
  noiseSuppression: NoiseSuppression.STANDARD,
  autoGainControl: true,
  noiseGateEnabled: false,
  noiseGateThresholdDb: -40,
  shareSystemAudio: true,
  restrictOwnAudio: false,
  suppressLocalAudioPlayback: false,
  mirrorOwnVideo: false,
  simulcastEnabled: true,
  screenShareSimulcastEnabled: false,
  directScreenSharing: true,
  voiceOnlyMode: false,
  screenResolution: Resolution['720p'],
  screenFramerate: 30,
  screenCodec: VideoCodec.AUTO,
  screenBitrate: 3000,
  screenCursor: ScreenCursor.ALWAYS
};

const devicesContext = {
  loading: false,
  devices,
  inputDevices: [],
  playbackDevices: [],
  videoDevices: [],
  saveDevices: noop,
  loadDevices: async () => {}
};

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <DevicesProviderContext.Provider value={devicesContext as never}>
      <Devices />
    </DevicesProviderContext.Provider>
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
