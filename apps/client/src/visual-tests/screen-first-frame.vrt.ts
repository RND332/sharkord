import {
  StreamKind,
  type AppRouter,
  type TProducibleStreamKind
} from '@dodecagon/shared';
import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import { Device } from 'mediasoup-client';
import type { Transport } from 'mediasoup-client/types';
import { expect, test } from 'vitest';

const connect = async (identity: string) => {
  const host = `localhost:${VITE_SERVER_PORT}`;
  const response = await fetch(`http://${host}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, password: 'password123' })
  });
  expect(response.ok).toBe(true);
  const { token } = await response.json();
  const socket = createWSClient({
    url: `ws://${host}`,
    connectionParams: { token }
  });
  const client = createTRPCProxyClient<AppRouter>({
    links: [wsLink({ client: socket })]
  });
  const { handshakeHash } = await client.others.handshake.query();
  await client.others.joinServer.query({ handshakeHash });
  return { client, socket };
};

test('a late screen viewer receives a decoded first frame promptly on a warm SFU transport', async () => {
  const publisher = await connect('rnd332');
  const viewer = await connect('aria');
  const transports: Transport[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const context = canvas.getContext('2d')!;
  let count = 0;
  const animation = setInterval(() => {
    context.fillStyle = count++ % 2 ? '#39c5cf' : '#e8488d';
    context.fillRect(0, 0, 320, 180);
  }, 30);
  const source = canvas.captureStream(30);
  const sound = new AudioContext();
  const oscillator = sound.createOscillator();
  const destination = sound.createMediaStreamDestination();
  oscillator.connect(destination);
  oscillator.start();
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  document.body.append(video);
  try {
    const joining = {
      channelId: 2,
      state: { micMuted: false, soundMuted: false }
    };
    const [publisherJoin, viewerJoin] = await Promise.all([
      publisher.client.voice.join.mutate(joining),
      viewer.client.voice.join.mutate(joining)
    ]);
    const sendDevice = new Device();
    const receiveDevice = new Device();
    await Promise.all([
      sendDevice.load({
        routerRtpCapabilities: publisherJoin.routerRtpCapabilities
      }),
      receiveDevice.load({
        routerRtpCapabilities: viewerJoin.routerRtpCapabilities
      })
    ]);
    const send = sendDevice.createSendTransport(
      await publisher.client.voice.createProducerTransport.mutate()
    );
    const receive = receiveDevice.createRecvTransport(
      await viewer.client.voice.createConsumerTransport.mutate()
    );
    transports.push(send, receive);
    send.on('connect', ({ dtlsParameters }, done, fail) => {
      publisher.client.voice.connectProducerTransport
        .mutate({ dtlsParameters })
        .then(done, fail);
    });
    receive.on('connect', ({ dtlsParameters }, done, fail) => {
      viewer.client.voice.connectConsumerTransport
        .mutate({ dtlsParameters })
        .then(done, fail);
    });
    send.on('produce', ({ rtpParameters, appData }, done, fail) => {
      publisher.client.voice.produce
        .mutate({
          transportId: send.id,
          kind: appData.kind as TProducibleStreamKind,
          rtpParameters
        })
        .then((id) => done({ id }), fail);
    });
    await send.produce({
      track: destination.stream.getAudioTracks()[0],
      appData: { kind: StreamKind.AUDIO }
    });
    const audio = await viewer.client.voice.consume.mutate({
      remoteId: 1,
      kind: StreamKind.AUDIO,
      rtpCapabilities: receiveDevice.rtpCapabilities
    });
    await receive.consume({
      id: audio.consumerId,
      producerId: audio.producerId,
      kind: 'audio',
      rtpParameters: audio.consumerRtpParameters
    });
    await expect.poll(() => receive.connectionState).toBe('connected');
    await send.produce({
      track: source.getVideoTracks()[0],
      appData: { kind: StreamKind.SCREEN }
    });
    const parameters = await viewer.client.voice.consume.mutate({
      remoteId: 1,
      kind: StreamKind.SCREEN,
      rtpCapabilities: receiveDevice.rtpCapabilities
    });
    // a connected receiver must not spend its first keyframe before native receive exists.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const consumer = await receive.consume({
      id: parameters.consumerId,
      producerId: parameters.producerId,
      kind: 'video',
      rtpParameters: parameters.consumerRtpParameters
    });
    video.srcObject = new MediaStream([consumer.track]);
    const decoded = Promise.withResolvers<number>();
    video.requestVideoFrameCallback(() => decoded.resolve(performance.now()));
    const playing = video.play();
    const start = performance.now();
    await viewer.client.voice.resumeConsumer.mutate({
      remoteId: 1,
      kind: StreamKind.SCREEN,
      consumerId: consumer.id
    });
    const firstFrame = await Promise.race([
      decoded.promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('No decoded first screen frame')),
          2000
        )
      )
    ]);
    await playing;
    const elapsed = firstFrame - start;
    console.info('real SFU first screen frame ms:', Math.round(elapsed));
    expect(elapsed).toBeLessThan(1500);
    expect(video.videoWidth).toBe(320);
    const stats = await consumer.getStats();
    expect(
      [...stats.values()].some(
        (entry) => entry.type === 'inbound-rtp' && entry.framesDecoded > 0
      )
    ).toBe(true);
  } finally {
    clearInterval(animation);
    source.getTracks().forEach((track) => track.stop());
    destination.stream.getTracks().forEach((track) => track.stop());
    oscillator.stop();
    await sound.close();
    video.remove();
    transports.forEach((transport) => transport.close());
    await Promise.allSettled([
      publisher.client.voice.leave.mutate(),
      viewer.client.voice.leave.mutate()
    ]);
    publisher.socket.close();
    viewer.socket.close();
  }
}, 15000);
