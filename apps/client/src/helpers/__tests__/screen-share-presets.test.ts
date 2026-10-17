import { Resolution, VideoCodec } from '@/types';
import { describe, expect, test } from 'bun:test';
import {
  getScreenShareCodecCandidates,
  getScreenShareContentHint,
  getScreenSharePreset,
  getScreenSharePresetSettings,
  ScreenSharePreset
} from '../screen-share-presets';

describe('screen share presets', () => {
  test('detects the motion preset and its content hint', () => {
    const settings = {
      screenResolution: Resolution['1080p'],
      screenFramerate: 60,
      screenBitrate: 8000
    };

    expect(getScreenSharePreset(settings)).toBe(ScreenSharePreset.MOTION);
    expect(getScreenShareContentHint(settings)).toBe('motion');
  });

  test('detects the text preset and its content hint', () => {
    const settings = {
      screenResolution: Resolution['1080p'],
      screenFramerate: 30,
      screenBitrate: 3000
    };

    expect(getScreenSharePreset(settings)).toBe(ScreenSharePreset.TEXT);
    expect(getScreenShareContentHint(settings)).toBe('detail');
  });

  test('keeps manual settings on the legacy motion hint', () => {
    const settings = {
      screenResolution: Resolution['720p'],
      screenFramerate: 30,
      screenBitrate: 4000
    };

    expect(getScreenSharePreset(settings)).toBeUndefined();
    expect(getScreenShareContentHint(settings)).toBe('motion');
  });

  test('motion prefers H264 then falls back to VP8', () => {
    expect(
      getScreenShareCodecCandidates(ScreenSharePreset.MOTION, VideoCodec.H264)
    ).toEqual([VideoCodec.H264, VideoCodec.VP8]);
  });

  test('text prefers H264, then VP9, then VP8', () => {
    expect(
      getScreenShareCodecCandidates(ScreenSharePreset.TEXT, VideoCodec.VP9)
    ).toEqual([VideoCodec.H264, VideoCodec.VP9, VideoCodec.VP8]);
  });

  test('applies the expected capture and bitrate values', () => {
    expect(
      getScreenSharePresetSettings(ScreenSharePreset.MOTION)
    ).toMatchObject({
      resolution: Resolution['1080p'],
      framerate: 60,
      bitrateKbps: 8000,
      startBitrateKbps: 4000,
      simulcast: false
    });
    expect(getScreenSharePresetSettings(ScreenSharePreset.TEXT)).toMatchObject({
      resolution: Resolution['1080p'],
      framerate: 30,
      bitrateKbps: 3000,
      startBitrateKbps: 1000,
      simulcast: true
    });
  });
});
