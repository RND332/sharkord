import { Resolution, VideoCodec, type TDeviceSettings } from '@/types';

export enum ScreenSharePreset {
  MOTION = 'motion',
  TEXT = 'text'
}

type TScreenSharePresetSettings = {
  resolution: Resolution;
  framerate: number;
  codec: VideoCodec;
  bitrateKbps: number;
  contentHint: 'motion' | 'detail';
  startBitrateKbps: number;
  simulcast: boolean;
};

const SCREEN_SHARE_PRESETS: Record<
  ScreenSharePreset,
  TScreenSharePresetSettings
> = {
  [ScreenSharePreset.MOTION]: {
    resolution: Resolution['1080p'],
    framerate: 60,
    codec: VideoCodec.H264,
    bitrateKbps: 8000,
    contentHint: 'motion',
    startBitrateKbps: 4000,
    simulcast: false
  },
  [ScreenSharePreset.TEXT]: {
    resolution: Resolution['1080p'],
    framerate: 30,
    codec: VideoCodec.VP9,
    bitrateKbps: 3000,
    contentHint: 'detail',
    startBitrateKbps: 1000,
    simulcast: true
  }
};

const getScreenSharePreset = (
  settings: Pick<
    TDeviceSettings,
    'screenResolution' | 'screenFramerate' | 'screenBitrate'
  >
): ScreenSharePreset | undefined => {
  if (
    settings.screenResolution === Resolution['1080p'] &&
    settings.screenFramerate >= 50 &&
    settings.screenBitrate >= 6000
  ) {
    return ScreenSharePreset.MOTION;
  }

  if (
    settings.screenResolution === Resolution['1080p'] &&
    settings.screenFramerate <= 30 &&
    settings.screenBitrate <= 3500
  ) {
    return ScreenSharePreset.TEXT;
  }

  return undefined;
};

const getScreenSharePresetSettings = (preset: ScreenSharePreset) => {
  return SCREEN_SHARE_PRESETS[preset];
};

const getScreenShareContentHint = (
  settings: Pick<
    TDeviceSettings,
    'screenResolution' | 'screenFramerate' | 'screenBitrate'
  >
): 'motion' | 'detail' => {
  const preset = getScreenSharePreset(settings);
  if (!preset) return 'motion';
  return SCREEN_SHARE_PRESETS[preset].contentHint;
};

const getScreenShareCodecCandidates = (
  preset: ScreenSharePreset | undefined,
  selectedCodec: VideoCodec
): VideoCodec[] => {
  if (preset === ScreenSharePreset.MOTION) {
    return [VideoCodec.H264, VideoCodec.VP8];
  }
  if (preset === ScreenSharePreset.TEXT) {
    return [VideoCodec.H264, VideoCodec.VP9, VideoCodec.VP8];
  }
  if (selectedCodec === VideoCodec.AUTO) return [];
  return [selectedCodec];
};

export {
  getScreenShareCodecCandidates,
  getScreenShareContentHint,
  getScreenSharePreset,
  getScreenSharePresetSettings
};
export type { TScreenSharePresetSettings };
