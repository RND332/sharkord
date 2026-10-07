import { ServerEvents, StreamKind } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import type { Consumer, Producer } from 'mediasoup/types';
import { eventBus } from '../../plugins/event-bus';
import { pubsub } from '../../utils/pubsub';
import { EXTERNAL_STREAM_ID_BASE, VoiceRuntime } from '../voice';

type TCloseHandler = () => void;

let nextProducerId = 0;

const createProducerStub = () => {
  const handlers: TCloseHandler[] = [];

  const stub = {
    id: `producer-${nextProducerId++}`,
    closed: false,
    paused: false,
    kind: 'audio',
    observer: {
      on: (event: string, handler: TCloseHandler) => {
        if (event === 'close') handlers.push(handler);
      }
    },
    close: () => {
      stub.closed = true;
      handlers.forEach((handler) => handler());
    }
  };

  return stub;
};

const createConsumerStub = createProducerStub;

let nextChannelId = 9000;

const createRuntime = () => new VoiceRuntime(nextChannelId++);

describe('VoiceRuntime destroy', () => {
  test('should announce the users still in the channel', async () => {
    const runtime = createRuntime();

    runtime.addUser(7, { micMuted: false, soundMuted: false });
    runtime.addUser(8, { micMuted: false, soundMuted: false });

    const left: number[] = [];

    const subscription = pubsub
      .subscribe(ServerEvents.USER_LEAVE_VOICE)
      .subscribe({
        next: ({ userId, channelId }) => {
          if (channelId === runtime.id) left.push(userId);
        }
      });

    await runtime.destroy();

    subscription.unsubscribe();

    expect(left.sort()).toEqual([7, 8]);
    expect(runtime.getState().users).toEqual([]);
  });
});

describe('VoiceRuntime producer and consumer maps', () => {
  test('should close the previous producer when one replaces it', () => {
    const runtime = createRuntime();
    const first = createProducerStub();
    const second = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, first as unknown as Producer);
    runtime.addProducer(1, StreamKind.AUDIO, second as unknown as Producer);

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(false);
    expect(runtime.getProducer(StreamKind.AUDIO, 1)).toBe(
      second as unknown as Producer
    );
  });

  test('should keep producers of other kinds when one is replaced', () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    const audio = createProducerStub();
    const screenAudio = createProducerStub();
    const replacement = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.addProducer(
      1,
      StreamKind.SCREEN_AUDIO,
      screenAudio as unknown as Producer
    );
    runtime.addProducer(
      1,
      StreamKind.AUDIO,
      replacement as unknown as Producer
    );

    expect(screenAudio.closed).toBe(false);
    expect(runtime.getProducer(StreamKind.SCREEN_AUDIO, 1)).toBe(
      screenAudio as unknown as Producer
    );
  });

  test('should close the previous consumer when one replaces it', () => {
    const runtime = createRuntime();
    const first = createConsumerStub();
    const second = createConsumerStub();

    runtime.addConsumer(1, 2, StreamKind.AUDIO, first as unknown as Consumer);
    runtime.addConsumer(1, 2, StreamKind.AUDIO, second as unknown as Consumer);

    expect(first.closed).toBe(true);
    expect(second.closed).toBe(false);
  });

  test('should not let a replaced consumer evict the live one on close', () => {
    const runtime = createRuntime();
    const first = createConsumerStub();
    const second = createConsumerStub();

    runtime.addConsumer(1, 2, StreamKind.AUDIO, first as unknown as Consumer);
    runtime.addConsumer(1, 2, StreamKind.AUDIO, second as unknown as Consumer);

    // the orphan dying later must not remove the entry that replaced it
    first.close();

    expect(runtime.getConsumer(1, 2, StreamKind.AUDIO)).toBe(
      second as unknown as Consumer
    );
  });
});

describe('VoiceRuntime external streams', () => {
  // the id reaches clients in the same field as a user id, and anything that reads
  // one as the other drops the stream for exactly the user whose id matched: the
  // music that played for everyone else. so the two ranges cannot overlap
  test('should hand out ids that cannot collide with user ids', () => {
    const runtime = createRuntime();

    const first = runtime.createExternalStream({
      title: 'First',
      key: 'first',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    const second = runtime.createExternalStream({
      title: 'Second',
      key: 'second',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(first).toBe(EXTERNAL_STREAM_ID_BASE);
    expect(second).toBe(EXTERNAL_STREAM_ID_BASE + 1);
  });

  test('should expose a new stream to the joining snapshot', () => {
    const runtime = createRuntime();

    const streamId = runtime.createExternalStream({
      title: 'Music',
      key: 'music',
      pluginId: 'music-bot',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(runtime.getRemoteIds(1).remoteExternalStreamIds).toEqual([streamId]);
  });
});

describe('VoiceRuntime producer listing', () => {
  test('should list every kind with the id a consumer needs', () => {
    const runtime = createRuntime();
    runtime.addUser(2, { micMuted: false, soundMuted: false });
    const audio = createProducerStub();
    const screen = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.addProducer(2, StreamKind.SCREEN, screen as unknown as Producer);

    expect(runtime.listProducers()).toEqual([
      {
        userId: 1,
        kind: StreamKind.AUDIO,
        producerId: audio.id,
        paused: false
      },
      {
        userId: 2,
        kind: StreamKind.SCREEN,
        producerId: screen.id,
        paused: false
      }
    ]);
  });

  test('should drop a producer that closed', () => {
    const runtime = createRuntime();
    const audio = createProducerStub();

    runtime.addProducer(1, StreamKind.AUDIO, audio as unknown as Producer);
    runtime.removeProducer(1, StreamKind.AUDIO);

    expect(runtime.listProducers()).toEqual([]);
  });

  // external streams belong to a plugin and have no user behind them
  test('should leave external streams out', () => {
    const runtime = createRuntime();

    runtime.createExternalStream({
      title: 'Radio',
      key: 'radio',
      pluginId: 'plugin-a',
      producers: { audio: createProducerStub() as unknown as Producer }
    });

    expect(runtime.listProducers()).toEqual([]);
  });
});

describe('VoiceRuntime producer events', () => {
  const listen = (event: 'voice:producer_added' | 'voice:producer_removed') => {
    const seen: unknown[] = [];

    const unregister = eventBus.register('test-plugin', event, (payload) => {
      seen.push(payload);
    });

    return { seen, unregister };
  };

  test('should announce a producer that arrives', async () => {
    const runtime = createRuntime();
    const producer = createProducerStub();
    const { seen, unregister } = listen('voice:producer_added');

    runtime.addProducer(3, StreamKind.AUDIO, producer as unknown as Producer);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: producer.id
      }
    ]);
  });

  test('should announce a producer that ends', async () => {
    const runtime = createRuntime();
    const producer = createProducerStub();

    runtime.addProducer(3, StreamKind.AUDIO, producer as unknown as Producer);

    const { seen, unregister } = listen('voice:producer_removed');

    runtime.removeProducer(3, StreamKind.AUDIO);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: producer.id
      }
    ]);
  });

  // the close observer is the only path, so a replacement has to report the
  // producer it replaced rather than the new one
  test('should announce the replaced producer when one takes over', async () => {
    const runtime = createRuntime();
    const first = createProducerStub();
    const second = createProducerStub();

    runtime.addProducer(3, StreamKind.AUDIO, first as unknown as Producer);

    const { seen, unregister } = listen('voice:producer_removed');

    runtime.addProducer(3, StreamKind.AUDIO, second as unknown as Producer);

    await Bun.sleep(0);
    unregister();

    expect(seen).toEqual([
      {
        channelId: runtime.id,
        userId: 3,
        kind: StreamKind.AUDIO,
        producerId: first.id
      }
    ]);
  });
});

describe('VoiceRuntime voice-only mode', () => {
  test('closes non-microphone media without changing microphone or sound state', async () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: true, soundMuted: true });
    const microphone = createProducerStub();
    const voice = createConsumerStub();
    const mediaKinds = [
      StreamKind.VIDEO,
      StreamKind.SCREEN,
      StreamKind.SCREEN_AUDIO
    ];
    const producers = mediaKinds.map(() => createProducerStub());
    const consumerKinds = [
      ...mediaKinds,
      StreamKind.EXTERNAL_AUDIO,
      StreamKind.EXTERNAL_VIDEO
    ];
    const consumers = consumerKinds.map(() => createConsumerStub());
    runtime.addProducer(1, StreamKind.AUDIO, microphone as unknown as Producer);
    runtime.addConsumer(1, 2, StreamKind.AUDIO, voice as unknown as Consumer);
    mediaKinds.forEach((kind, index) => {
      runtime.addProducer(1, kind, producers[index] as unknown as Producer);
    });
    consumerKinds.forEach((kind, index) => {
      runtime.addConsumer(1, 2, kind, consumers[index] as unknown as Consumer);
    });

    try {
      runtime.updateUserState(1, {
        voiceOnlyMode: true,
        webcamEnabled: true,
        sharingScreen: true
      });
      expect(runtime.getUserState(1)).toMatchObject({
        voiceOnlyMode: true,
        micMuted: true,
        soundMuted: true,
        webcamEnabled: false,
        sharingScreen: false
      });
      expect(microphone.closed).toBe(false);
      expect(voice.closed).toBe(false);
      expect(runtime.getConsumer(1, 2, StreamKind.AUDIO)).toBe(
        voice as unknown as Consumer
      );
      producers.forEach((producer) => expect(producer.closed).toBe(true));
      consumers.forEach((consumer, index) => {
        expect(consumer.closed).toBe(true);
        expect(
          runtime.getConsumer(1, 2, consumerKinds[index]!)
        ).toBeUndefined();
      });
      runtime.updateUserState(1, { webcamEnabled: true, sharingScreen: true });
      expect(runtime.getUserState(1)).toMatchObject({
        webcamEnabled: false,
        sharingScreen: false
      });
      runtime.updateUserState(1, { voiceOnlyMode: undefined, micMuted: false });
      expect(runtime.getUserState(1)).toMatchObject({
        voiceOnlyMode: true,
        micMuted: false,
        soundMuted: true
      });
      expect(() => runtime.assertMediaAllowed(1, StreamKind.SCREEN)).toThrow();
    } finally {
      await runtime.destroy();
    }
  });

  test('rejects non-microphone attachments and accepts them again when disabled', async () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    runtime.updateUserState(1, { voiceOnlyMode: true });
    try {
      for (const kind of [
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.SCREEN_AUDIO,
        StreamKind.EXTERNAL_VIDEO,
        StreamKind.EXTERNAL_AUDIO
      ]) {
        const consumer = createConsumerStub();
        expect(() =>
          runtime.addConsumer(1, 2, kind, consumer as unknown as Consumer)
        ).toThrow('Voice-only mode');
        expect(consumer.closed).toBe(true);
        expect(runtime.getConsumer(1, 2, kind)).toBeUndefined();
      }
      for (const kind of [
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.SCREEN_AUDIO
      ]) {
        const producer = createProducerStub();
        expect(() =>
          runtime.addProducer(1, kind, producer as unknown as Producer)
        ).toThrow('Voice-only mode');
        expect(producer.closed).toBe(true);
        expect(runtime.getProducer(kind, 1)).toBeUndefined();
      }
      const microphone = createProducerStub();
      runtime.addProducer(
        1,
        StreamKind.AUDIO,
        microphone as unknown as Producer
      );
      expect(microphone.closed).toBe(false);
      runtime.updateUserState(1, { voiceOnlyMode: false });
      const screen = createProducerStub();
      const externalAudio = createConsumerStub();
      runtime.addProducer(1, StreamKind.SCREEN, screen as unknown as Producer);
      runtime.addConsumer(
        1,
        2,
        StreamKind.EXTERNAL_AUDIO,
        externalAudio as unknown as Consumer
      );
      expect(screen.closed).toBe(false);
      expect(externalAudio.closed).toBe(false);
    } finally {
      await runtime.destroy();
    }
  });

  test('closes stale native resources even after voice-only mode is disabled again', async () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    const generation = runtime.getNonVoiceMediaGeneration(1);
    runtime.updateUserState(1, { voiceOnlyMode: true });
    runtime.updateUserState(1, { voiceOnlyMode: false });
    const producer = createProducerStub();
    const consumer = createConsumerStub();
    try {
      expect(() =>
        runtime.addProducer(
          1,
          StreamKind.SCREEN,
          producer as unknown as Producer,
          undefined,
          generation
        )
      ).toThrow('Voice-only mode');
      expect(() =>
        runtime.addConsumer(
          1,
          2,
          StreamKind.EXTERNAL_AUDIO,
          consumer as unknown as Consumer,
          generation
        )
      ).toThrow('Voice-only mode');
      expect(producer.closed).toBe(true);
      expect(consumer.closed).toBe(true);
      expect(runtime.getProducer(StreamKind.SCREEN, 1)).toBeUndefined();
      expect(
        runtime.getConsumer(1, 2, StreamKind.EXTERNAL_AUDIO)
      ).toBeUndefined();
    } finally {
      await runtime.destroy();
    }
  });

  test('rejects nonvoice attachments after departure even without a captured token', async () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    runtime.removeUser(1);
    const producer = createProducerStub();
    const consumer = createConsumerStub();
    try {
      expect(() =>
        runtime.addProducer(
          1,
          StreamKind.SCREEN,
          producer as unknown as Producer
        )
      ).toThrow('Voice-only mode');
      expect(() =>
        runtime.addConsumer(
          1,
          2,
          StreamKind.EXTERNAL_AUDIO,
          consumer as unknown as Consumer
        )
      ).toThrow('Voice-only mode');
      expect(producer.closed).toBe(true);
      expect(consumer.closed).toBe(true);
      expect(runtime.getProducer(StreamKind.SCREEN, 1)).toBeUndefined();
      expect(
        runtime.getConsumer(1, 2, StreamKind.EXTERNAL_AUDIO)
      ).toBeUndefined();
    } finally {
      await runtime.destroy();
    }
  });

  test('never lets a departed membership replace a rejoined users media', async () => {
    const runtime = createRuntime();
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    const departedGeneration = runtime.getNonVoiceMediaGeneration(1);
    runtime.removeUser(1);
    runtime.addUser(2, { micMuted: false, soundMuted: false });
    const otherGeneration = runtime.getNonVoiceMediaGeneration(2);
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    const currentGeneration = runtime.getNonVoiceMediaGeneration(1);
    const producer = createProducerStub();
    const consumer = createConsumerStub();
    const staleProducer = createProducerStub();
    const staleConsumer = createConsumerStub();
    try {
      expect(currentGeneration).toBeGreaterThan(departedGeneration);
      expect(currentGeneration).toBeGreaterThan(otherGeneration);
      runtime.addProducer(
        1,
        StreamKind.SCREEN,
        producer as unknown as Producer,
        undefined,
        currentGeneration
      );
      runtime.addConsumer(
        1,
        2,
        StreamKind.EXTERNAL_AUDIO,
        consumer as unknown as Consumer,
        currentGeneration
      );
      expect(() =>
        runtime.addProducer(
          1,
          StreamKind.SCREEN,
          staleProducer as unknown as Producer,
          undefined,
          departedGeneration
        )
      ).toThrow('Voice-only mode');
      expect(() =>
        runtime.addConsumer(
          1,
          2,
          StreamKind.EXTERNAL_AUDIO,
          staleConsumer as unknown as Consumer,
          departedGeneration
        )
      ).toThrow('Voice-only mode');
      expect(staleProducer.closed).toBe(true);
      expect(staleConsumer.closed).toBe(true);
      expect(runtime.getProducer(StreamKind.SCREEN, 1)).toBe(
        producer as unknown as Producer
      );
      expect(runtime.getConsumer(1, 2, StreamKind.EXTERNAL_AUDIO)).toBe(
        consumer as unknown as Consumer
      );
      expect(producer.closed).toBe(false);
      expect(consumer.closed).toBe(false);
    } finally {
      await runtime.destroy();
    }
  });
});
