import { type TTransportParams } from '@dodecagon/shared';
import { expect, mock, test } from 'bun:test';
import * as React from 'react';

mock.module('react', () => ({
  ...React,
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useEffect: () => {}
}));
mock.module('@/helpers/browser-logger', () => ({
  logVoice: () => {},
  logVoiceWarn: () => {},
  logVoiceError: () => {}
}));

const params = (id: string): TTransportParams => ({
  id,
  iceParameters: { usernameFragment: 'user', password: 'password' },
  iceCandidates: [],
  dtlsParameters: { role: 'auto', fingerprints: [] },
  iceServers: [
    { urls: ['stun:stun.example.org:3478'] },
    {
      urls: ['turn:turn.example.org:3478'],
      username: '123:7',
      credential: 'credential'
    }
  ]
});

const createProducerTransport = mock(async () => params('send'));
const createConsumerTransport = mock(async () => params('recv'));
mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    voice: {
      createProducerTransport: { mutate: createProducerTransport },
      createConsumerTransport: { mutate: createConsumerTransport }
    }
  })
}));

const { useTransports } = await import('../hooks/use-transports');

const fakeTransport = () =>
  ({
    id: 'transport',
    closed: false,
    on: () => {},
    close: () => {}
  }) as never;

const fakeDevice = () => {
  const send = mock((_options: unknown) => fakeTransport());
  const recv = mock((_options: unknown) => fakeTransport());
  return {
    device: {
      createSendTransport: send,
      createRecvTransport: recv
    } as never,
    send,
    recv
  };
};

const noop = () => {};

test('passes server ICE servers to both mediasoup transports', async () => {
  const { createProducerTransport, createConsumerTransport } = useTransports({
    voiceOnlyMode: false,
    canConsumeScreen: () => true,
    addRemoteUserStream: noop,
    removeRemoteUserStream: noop,
    addExternalStreamTrack: noop,
    removeExternalStreamTrack: noop,
    setRemoteConsumerType: noop,
    setRemoteStreamQualityLayers: noop,
    clearRemoteConsumerMetadata: noop
  });
  const { device, send, recv } = fakeDevice();

  await createProducerTransport(device);
  await createConsumerTransport(device);

  expect(send.mock.calls[0]![0]).toMatchObject({
    iceServers: params('send').iceServers
  });
  expect(recv.mock.calls[0]![0]).toMatchObject({
    iceServers: params('recv').iceServers
  });
});
