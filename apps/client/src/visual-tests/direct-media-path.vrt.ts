import { DirectMedia } from '@/components/voice-provider/direct-media';
import {
  useTransportStats,
  type TransportStatsData
} from '@/components/voice-provider/hooks/use-transport-stats';
import { StreamKind, type TDirectMediaEvent } from '@sharkord/shared';
import { createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

test.each([StreamKind.SCREEN, StreamKind.VIDEO, StreamKind.AUDIO] as const)(
  'two opted-in peers decode %s over native P2P without a relay',
  async (kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const drawing = canvas.getContext('2d')!;
    let frame = 0;
    const draw = () => {
      drawing.fillStyle = frame++ % 2 ? '#39c5cf' : '#e8488d';
      drawing.fillRect(0, 0, canvas.width, canvas.height);
    };
    draw();
    const context = kind === StreamKind.AUDIO ? new AudioContext() : undefined;
    let capture: MediaStream;
    if (context) {
      const destination = context.createMediaStreamDestination();
      const tone = context.createOscillator();
      const level = context.createGain();
      level.gain.value = 0.1;
      tone.frequency.value = 440;
      tone.connect(level).connect(destination);
      tone.start();
      capture = destination.stream;
      const start = document.createElement('button');
      start.textContent = 'Start synthetic audio';
      start.onclick = () => context.resume();
      document.body.append(start);
      await userEvent.click(start);
      start.remove();
    } else {
      capture = canvas.captureStream(15);
    }
    const timer = window.setInterval(draw, 50);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    document.body.append(video);
    const session = {
      sessionId: crypto.randomUUID(),
      peerId: 2,
      stunUrls: [],
      kind
    };
    const failed = vi.fn(async () => {});
    const statuses: string[] = [];

    const event = (
      fromUserId: number,
      signal: TDirectMediaEvent['signal']
    ): TDirectMediaEvent => ({
      relayAllowed: false,
      sessionId: session.sessionId,
      channelId: 42,
      senderId: 1,
      fromUserId,
      stunUrls: [],
      kind,
      signal
    });
    const presenter: DirectMedia = new DirectMedia({
      kind,
      prepare: async () => session,
      send: async (_sessionId, signal) => viewer.handleSignal(event(1, signal)),
      onStream: vi.fn(),
      onRemoveStream: vi.fn(),
      onStatus: (status) => statuses.push(status),
      onError: vi.fn()
    });
    const received = vi.fn(
      (_userId: number, stream: MediaStream, receivedKind: StreamKind) => {
        if (receivedKind === kind) video.srcObject = stream;
      }
    );
    const viewer: DirectMedia = new DirectMedia({
      kind,
      prepare: async () => null,
      canReceive: () => true,
      send: async (_sessionId, signal) =>
        presenter.handleSignal(event(2, signal)),
      onStream: received,
      onRemoveStream: vi.fn(),
      onStatus: vi.fn(),
      onError: vi.fn()
    });
    let statsRoot: Root | undefined;
    const statsHost = document.createElement('div');
    let latestStats: TransportStatsData | undefined;
    const StatsProbe = () => {
      const { stats, subscribe, startMonitoring, stopMonitoring } =
        useTransportStats([presenter]);
      useEffect(() => {
        latestStats = stats;
      }, [stats]);
      useEffect(() => {
        const unsubscribe = subscribe();
        startMonitoring();
        return () => {
          stopMonitoring();
          unsubscribe();
        };
      }, [startMonitoring, stopMonitoring, subscribe]);
      return null;
    };
    try {
      expect(
        await presenter.start(capture, {
          maxBitrate: 1_000_000,
          onFailure: failed
        })
      ).toBe('direct');
      expect(statuses).toEqual(['connecting', 'direct']);
      expect(presenter.getConnections()).toMatchObject([
        { peerId: 2, kind, direction: 'outgoing' }
      ]);
      expect(viewer.getConnections()).toMatchObject([
        { peerId: 1, kind, direction: 'incoming' }
      ]);
      expect(received).toHaveBeenCalledTimes(1);
      expect(received).toHaveBeenCalledWith(1, expect.any(MediaStream), kind);
      await video.play();
      if (context) {
        const analyser = context.createAnalyser();
        const silent = context.createGain();
        silent.gain.value = 0;
        context
          .createMediaStreamSource(video.srcObject as MediaStream)
          .connect(analyser);
        analyser.connect(silent).connect(context.destination);
        const samples = new Float32Array(analyser.fftSize);
        await expect
          .poll(() => {
            analyser.getFloatTimeDomainData(samples);
            return Math.max(...samples.map(Math.abs));
          })
          .toBeGreaterThan(0.01);
      } else {
        await expect
          .poll(() => video.getVideoPlaybackQuality().totalVideoFrames)
          .toBeGreaterThan(0);
      }
      document.body.append(statsHost);
      statsRoot = createRoot(statsHost);
      statsRoot.render(createElement(StatsProbe));
      await expect
        .poll(() => latestStats?.peerRtts[2])
        .toEqual(expect.any(Number));
      await expect
        .poll(() => latestStats?.totalBytesSent ?? 0)
        .toBeGreaterThan(0);
      expect(latestStats?.producer).toBeNull();
      expect(latestStats?.consumer).toBeNull();
      expect(failed).not.toHaveBeenCalled();
      expect(
        capture.getTracks().every((track) => track.readyState === 'live')
      ).toBe(true);
    } finally {
      statsRoot?.unmount();
      statsHost.remove();
      presenter.close();
      viewer.close();
      window.clearInterval(timer);
      video.pause();
      video.srcObject = null;
      video.remove();
      capture.getTracks().forEach((track) => track.stop());
      await context?.close();
    }
  }
);
