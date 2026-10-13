import { expect, test } from 'bun:test';
import { Producer } from '../../../../../../node_modules/mediasoup-client/lib/Producer.js';

test('real Producer.close does not await an asynchronous observer listener', async () => {
  const track = Object.assign(new EventTarget(), {
    kind: 'audio',
    enabled: true,
    readyState: 'live',
    stop() {
      this.readyState = 'ended';
    }
  });
  const producer = new Producer({
    id: crypto.randomUUID(),
    localId: '0',
    track: track as unknown as MediaStreamTrack,
    rtpParameters: { codecs: [], encodings: [] },
    stopTracks: true,
    disableTrackOnPause: true,
    zeroRtpOnPause: false
  });
  let resolve!: () => void;
  const pending = new Promise<void>((done) => {
    resolve = done;
  });
  let listenerStarted = false;
  let listenerFinished = false;
  producer.observer.on('close', async () => {
    listenerStarted = true;
    await pending;
    listenerFinished = true;
  });

  expect(producer.close()).toBeUndefined();
  expect(producer.closed).toBe(true);
  expect(track.readyState).toBe('ended');
  expect(listenerStarted).toBe(true);
  await Bun.sleep(10);
  expect(listenerFinished).toBe(false);
  resolve();
  await pending;
  expect(listenerFinished).toBe(true);
});
