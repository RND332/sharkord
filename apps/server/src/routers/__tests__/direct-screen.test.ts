import {
  ChannelPermission,
  Permission,
  ServerEvents,
  StreamKind,
  type TDirectScreenEvent
} from '@sharkord/shared';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { getCaller, initTest, type TTestCaller } from '../../__tests__/helpers';
import { tdb, testLogs } from '../../__tests__/setup';
import { config, defaultConfig, envOverridesMap, zConfig } from '../../config';
import { channelRolePermissions, rolePermissions } from '../../db/schema';
import { applyEnvOverrides } from '../../helpers/apply-env-overrides';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';

// removing the two-person gate would expose direct signalling to group calls
// and leave the sender uploading a separate stream for each listener.
test('ends a direct screen session when a third participant joins', async () => {
  const runtime = new VoiceRuntime(2);
  runtime.addUser(1, { micMuted: false, soundMuted: false });
  runtime.addUser(2, { micMuted: false, soundMuted: false });
  const { caller: sender } = await initTest(1, undefined, {
    currentVoiceChannelId: 2
  });
  const { caller: receiver } = await initTest(2, undefined, {
    currentVoiceChannelId: 2
  });
  const previous = config.webRtc.directScreenSharing;
  config.webRtc.directScreenSharing = true;
  const signals: string[] = [];
  const observation = pubsub
    .subscribeFor(1, ServerEvents.DIRECT_SCREEN_SIGNAL)
    .subscribe({ next: (event) => signals.push(event.signal.type) });
  let senderSubscription: { unsubscribe: () => void } | undefined;
  let receiverSubscription: { unsubscribe: () => void } | undefined;
  try {
    senderSubscription = (
      await sender.voice.onDirectScreenSignal({ enabled: true })
    ).subscribe({ next: () => {} });
    receiverSubscription = (
      await receiver.voice.onDirectScreenSignal({ enabled: true })
    ).subscribe({ next: () => {} });
    const session = await sender.voice.startDirectScreen({});
    expect(session?.peerId).toBe(2);
    runtime.addUser(3, { micMuted: false, soundMuted: false });
    expect(signals).toEqual(['fallback']);
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: session!.sessionId,
        signal: { type: 'offer', sdp: 'v=0\r\n' }
      })
    ).rejects.toThrow('Direct screen session not found');
  } finally {
    senderSubscription?.unsubscribe();
    receiverSubscription?.unsubscribe();
    observation.unsubscribe();
    config.webRtc.directScreenSharing = previous;
    await runtime.destroy();
  }
});

const clock = () => {
  const deadlines = new Map<
    NodeJS.Timeout,
    { callback: () => void; delay: number }
  >();
  const setDeadline = Object.assign(
    (...[handler, delay]: Parameters<typeof setTimeout>) => {
      const handle = { unref: () => handle } as unknown as NodeJS.Timeout;
      deadlines.set(handle, {
        callback: () => {
          if (typeof handler === 'function') handler();
        },
        delay: delay ?? 0
      });
      return handle;
    },
    globalThis.setTimeout
  );
  spyOn(globalThis, 'setTimeout').mockImplementation(setDeadline);
  spyOn(globalThis, 'clearTimeout').mockImplementation((handle) => {
    deadlines.delete(handle as NodeJS.Timeout);
  });
  return {
    advance: (milliseconds: number) => {
      for (const [handle, deadline] of deadlines) {
        if (deadline.delay > milliseconds) continue;
        deadlines.delete(handle);
        deadline.callback();
      }
    }
  };
};
const subscriptions: { unsubscribe: () => void }[] = [];
const runtimes: VoiceRuntime[] = [];
const originalEnabled = config.webRtc.directScreenSharing;
const originalStun = config.webRtc.directScreenStunUrls;
const offer = {
  type: 'offer',
  sdp: 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
} as const;
const answer = {
  type: 'answer',
  sdp: 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
} as const;

afterEach(async () => {
  for (const subscription of subscriptions.splice(0))
    subscription.unsubscribe();
  for (const runtime of runtimes.splice(0)) await runtime.destroy();
  config.webRtc.directScreenSharing = originalEnabled;
  config.webRtc.directScreenStunUrls = originalStun;
});

const pair = async (channelId = 2) => {
  config.webRtc.directScreenSharing = true;
  const runtime = new VoiceRuntime(channelId);
  runtimes.push(runtime);
  runtime.addUser(1, { micMuted: false, soundMuted: false });
  runtime.addUser(2, { micMuted: false, soundMuted: false });
  const { caller: sender } = await initTest(1, undefined, {
    currentVoiceChannelId: channelId
  });
  const { caller: receiver } = await initTest(2, undefined, {
    currentVoiceChannelId: channelId
  });
  return { runtime, sender, receiver };
};

const listen = async (caller: TTestCaller, enabled = true) => {
  const events: TDirectScreenEvent[] = [];
  const subscription = (
    await caller.voice.onDirectScreenSignal({ enabled })
  ).subscribe({
    next: (event) => events.push(event)
  });
  subscriptions.push(subscription);
  return { events, subscription };
};

const prepared = async () => {
  const result = await pair();
  const sending = await listen(result.sender);
  const receiving = await listen(result.receiver);
  const session = await result.sender.voice.startDirectScreen({});
  expect(session).not.toBeNull();
  return { ...result, sending, receiving, session: session! };
};

const revoke = async (permission: Permission) => {
  await tdb
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, 2),
        eq(rolePermissions.permission, permission)
      )
    );
};

test('voice-only mode ends direct media and blocks capability until disabled', async () => {
  const { runtime, sender, receiver, sending, receiving, session } =
    await prepared();
  await receiver.voice.updateState({ voiceOnlyMode: true });
  expect(runtime.hasDirectScreenCapability(2)).toBe(false);
  expect(runtime.getDirectScreenSession(session.sessionId, 1)).toBeUndefined();
  expect(sending.events.map((event) => event.signal.type)).toEqual([
    'fallback'
  ]);
  expect(receiving.events.map((event) => event.signal.type)).toEqual([
    'fallback'
  ]);
  expect(await sender.voice.startDirectScreen({})).toBeNull();
  const replacement = runtime.registerDirectScreenSubscriber(2, true);
  expect(runtime.hasDirectScreenCapability(2)).toBe(false);
  await receiver.voice.updateState({ voiceOnlyMode: false });
  expect(runtime.hasDirectScreenCapability(2)).toBe(true);
  expect(await sender.voice.startDirectScreen({})).not.toBeNull();
  replacement.unregister();
});

describe('direct screen configuration', () => {
  test('keeps existing deployments on the relayed path', async () => {
    const { sender, receiver } = await pair();
    await listen(sender);
    await listen(receiver);
    config.webRtc.directScreenSharing =
      zConfig.parse(defaultConfig).webRtc.directScreenSharing;
    expect(await sender.voice.startDirectScreen({})).toBeNull();
  });

  test('validates STUN-only lists and their bounds', () => {
    const parse = (directScreenStunUrls: unknown) =>
      zConfig.parse({
        ...defaultConfig,
        webRtc: { ...defaultConfig.webRtc, directScreenStunUrls }
      });
    expect(
      parse('stun:example.org:3478,stuns:example.org:5349').webRtc
        .directScreenStunUrls
    ).toEqual(['stun:example.org:3478', 'stuns:example.org:5349']);
    expect(parse([]).webRtc.directScreenStunUrls).toEqual([]);
    for (const value of [
      ['turn:example.org'],
      ['turns:example.org'],
      ['https://example.org'],
      ['stun:'],
      ['stun:example.org/path'],
      ['stun:user@host'],
      ['stun:host?transport=tcp'],
      ['stun:host:99999'],
      ['stun:host:0'],
      ['stun:host '],
      Array.from({ length: 9 }, () => 'stun:example.org')
    ])
      expect(() => parse(value)).toThrow();
  });

  test('supports validated environment opt-in and STUN configuration', () => {
    const keys = [
      'SHARKORD_WEBRTC_DIRECT_SCREEN_SHARING',
      'SHARKORD_WEBRTC_DIRECT_SCREEN_STUN_URLS'
    ];
    const saved = keys.map((key) => process.env[key]);
    try {
      process.env[keys[0]!] = 'true';
      process.env[keys[1]!] = 'stun:example.org:3478';
      const result = zConfig.parse(
        applyEnvOverrides(defaultConfig, envOverridesMap)
      );
      expect(result.webRtc.directScreenSharing).toBe(true);
      expect(result.webRtc.directScreenStunUrls).toEqual([
        'stun:example.org:3478'
      ]);
      process.env[keys[0]!] = 'false';
      expect(
        zConfig.parse(applyEnvOverrides(defaultConfig, envOverridesMap)).webRtc
          .directScreenSharing
      ).toBe(false);
      process.env[keys[1]!] = 'turn:example.org';
      expect(() =>
        zConfig.parse(applyEnvOverrides(defaultConfig, envOverridesMap))
      ).toThrow();
    } finally {
      keys.forEach((key, index) => {
        if (saved[index] === undefined) delete process.env[key];
        else process.env[key] = saved[index];
      });
    }
  });
});

describe('startDirectScreen', () => {
  test('requires two actual opted-in subscribers, not just observable creation', async () => {
    const { sender, receiver } = await pair();
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    await listen(sender);
    const observable = await receiver.voice.onDirectScreenSignal({
      enabled: true
    });
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    const subscription = observable.subscribe({ next: () => {} });
    subscriptions.push(subscription);
    expect((await sender.voice.startDirectScreen({}))?.peerId).toBe(2);
  });

  test('declines legacy, disabled and group peers', async () => {
    const { runtime, sender, receiver } = await pair();
    await listen(sender);
    await listen(receiver, false);
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    await listen(receiver);
    runtime.addUser(3, { micMuted: false, soundMuted: false });
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    runtime.removeUser(2);
    runtime.removeUser(3);
    expect(await sender.voice.startDirectScreen({})).toBeNull();
  });

  test('derives peer and session identifiers and returns configured STUN servers', async () => {
    const { sender, receiver } = await pair();
    await listen(sender);
    await listen(receiver);
    config.webRtc.directScreenStunUrls = ['stun:example.org:3478'];
    const session = await sender.voice.startDirectScreen({});
    expect(session).toEqual({
      sessionId: expect.any(String),
      peerId: 2,
      stunUrls: ['stun:example.org:3478']
    });
    expect(session!.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await sender.voice.startDirectScreen({})).toBeNull();
  });

  test('allows independent simultaneous opposite shares', async () => {
    const { sender, receiver, session } = await prepared();
    const opposite = await receiver.voice.startDirectScreen({});
    expect(opposite?.peerId).toBe(1);
    expect(opposite?.sessionId).not.toBe(session.sessionId);
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'stop' }
    });
    await receiver.voice.signalDirectScreen({
      sessionId: opposite!.sessionId,
      signal: offer
    });
  });

  test('does not upgrade an existing relayed share or an external stream', async () => {
    const { runtime, sender, receiver } = await pair();
    await listen(sender);
    await listen(receiver);
    await runtime.init();
    const transport = await runtime.getRouter().createDirectTransport();
    const producer = await transport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [{ mimeType: 'video/VP8', payloadType: 96, clockRate: 90000 }],
        encodings: [{ ssrc: 1234 }]
      }
    });
    try {
      runtime.addProducer(1, StreamKind.SCREEN, producer);
      expect(await sender.voice.startDirectScreen({})).toBeNull();
      runtime.removeProducer(1, StreamKind.SCREEN);
      runtime.createExternalStream({
        title: 'external',
        key: 'key',
        pluginId: 'plugin',
        producers: {}
      });
      expect(await sender.voice.startDirectScreen({})).toBeNull();
    } finally {
      transport.close();
    }
  });

  for (const permission of [
    Permission.JOIN_VOICE_CHANNELS,
    Permission.SHARE_SCREEN
  ]) {
    test(`rejects missing global ${permission} permission`, async () => {
      const { receiver } = await pair();
      await revoke(permission);
      await expect(receiver.voice.startDirectScreen({})).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  }

  test('checks runtime existence, actual membership and input shape', async () => {
    const { sender } = await pair();
    const { caller: absent } = await initTest(3);
    await expect(absent.voice.startDirectScreen({})).rejects.toThrow(
      'User is not in a voice channel'
    );
    const { caller: missing } = await initTest(3, undefined, {
      currentVoiceChannelId: 999999
    });
    await expect(missing.voice.startDirectScreen({})).rejects.toThrow();
    const { caller: outsider } = await initTest(3, undefined, {
      currentVoiceChannelId: 2
    });
    await expect(outsider.voice.startDirectScreen({})).rejects.toThrow(
      'User is not in this voice channel'
    );
    await expect(
      sender.voice.startDirectScreen({ peerId: 3 } as never)
    ).rejects.toThrow();
    for (const channelId of [1, 3]) {
      const { caller } = await initTest(1, undefined, {
        currentVoiceChannelId: channelId
      });
      await expect(caller.voice.startDirectScreen({})).rejects.toThrow(
        'Channel is not a voice channel'
      );
    }
  });

  test('rejects a sender without channel view or share access', async () => {
    const { receiver } = await pair(4);
    await expect(receiver.voice.startDirectScreen({})).rejects.toThrow(
      'Insufficient channel permissions'
    );
    await tdb.insert(channelRolePermissions).values({
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: true,
      createdAt: Date.now()
    });
    await expect(receiver.voice.startDirectScreen({})).rejects.toThrow(
      'Insufficient channel permissions'
    );
  });

  test('declines a receiver who cannot view the channel', async () => {
    const { sender, receiver } = await pair(4);
    await listen(sender);
    await tdb.insert(channelRolePermissions).values({
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: true,
      createdAt: Date.now()
    });
    await listen(receiver);
    await tdb
      .delete(channelRolePermissions)
      .where(eq(channelRolePermissions.channelId, 4));
    expect(await sender.voice.startDirectScreen({})).toBeNull();
  });

  test('rate limits session preparation', async () => {
    const { sender } = await pair();
    for (
      let index = 0;
      index < config.rateLimiters.voiceStream.maxRequests;
      index++
    ) {
      expect(await sender.voice.startDirectScreen({})).toBeNull();
    }
    await expect(sender.voice.startDirectScreen({})).rejects.toThrow(
      'Too many requests'
    );
  });
});

describe('onDirectScreenSignal', () => {
  test('requires membership, current runtime and channel visibility', async () => {
    await pair();
    const { caller: absent } = await initTest(3);
    await expect(
      absent.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow();
    const { caller: outsider } = await initTest(3, undefined, {
      currentVoiceChannelId: 2
    });
    await expect(
      outsider.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow('User is not in this voice channel');
    const { caller: missing } = await initTest(3, undefined, {
      currentVoiceChannelId: 999999
    });
    await expect(
      missing.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow();
    const privateRuntime = new VoiceRuntime(4);
    runtimes.push(privateRuntime);
    privateRuntime.addUser(3, { micMuted: false, soundMuted: false });
    const { caller: privateCaller } = await initTest(3, undefined, {
      currentVoiceChannelId: 4
    });
    await expect(
      privateCaller.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow('Insufficient channel permissions');
  });

  test('checks global join permission and validates enabled', async () => {
    const { receiver } = await pair();
    await expect(
      receiver.voice.onDirectScreenSignal({ enabled: 'true' } as never)
    ).rejects.toThrow();
    await revoke(Permission.JOIN_VOICE_CHANNELS);
    await expect(
      receiver.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('overlapping subscription cleanup never revives an older enabled capability', async () => {
    const { sender, receiver } = await pair();
    await listen(sender);
    const old = await listen(receiver);
    const current = await listen(receiver);
    old.subscription.unsubscribe();
    expect(await sender.voice.startDirectScreen({})).not.toBeNull();
    const disabled = await listen(receiver, false);
    disabled.subscription.unsubscribe();
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    current.subscription.unsubscribe();
    await listen(receiver);
    expect(await sender.voice.startDirectScreen({})).not.toBeNull();
  });

  test('rate limits subscription registration attempts', async () => {
    const { sender } = await pair();
    for (
      let index = 0;
      index < config.rateLimiters.voiceStream.maxRequests;
      index++
    ) {
      await sender.voice.onDirectScreenSignal({ enabled: true });
    }
    await expect(
      sender.voice.onDirectScreenSignal({ enabled: true })
    ).rejects.toThrow('Too many requests');
  });

  test('a delayed observable cannot revive capability after leave and rejoin', async () => {
    const { runtime, sender, receiver } = await pair();
    await listen(sender);
    const delayed = await receiver.voice.onDirectScreenSignal({
      enabled: true
    });
    runtime.removeUser(2);
    runtime.addUser(2, { micMuted: false, soundMuted: false });
    subscriptions.push(delayed.subscribe({ next: () => {} }));
    expect(await sender.voice.startDirectScreen({})).toBeNull();
  });

  test('a moderator move blocks delayed and fresh capability subscriptions until rejoin', async () => {
    const { runtime, sender, receiver } = await pair();
    await listen(sender);
    const delayed = await receiver.voice.onDirectScreenSignal({
      enabled: true
    });
    await sender.voice.moveUser({ userId: 2, channelId: 4 });
    subscriptions.push(delayed.subscribe({ next: () => {} }));
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    await listen(receiver);
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    runtime.removeUser(2);
    runtime.addUser(2, { micMuted: false, soundMuted: false });
    await listen(receiver);
    const session = await sender.voice.startDirectScreen({});
    expect(session?.peerId).toBe(2);
    await sender.voice.signalDirectScreen({
      sessionId: session!.sessionId,
      signal: { type: 'stop' }
    });
  });

  test('ordinary subscription cleanup allows a new subscription in the same membership', async () => {
    const { sender, receiver } = await pair();
    await listen(sender);
    const current = await listen(receiver);
    current.subscription.unsubscribe();
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    await listen(receiver);
    const session = await sender.voice.startDirectScreen({});
    expect(session?.peerId).toBe(2);
    await sender.voice.signalDirectScreen({
      sessionId: session!.sessionId,
      signal: { type: 'stop' }
    });
  });
});

describe('signalDirectScreen', () => {
  test('delivers SDP only to its paired peer and never broadcasts it', async () => {
    const { sender, receiver, sending, receiving, session } = await prepared();
    const broadcasts: TDirectScreenEvent[] = [];
    const others: TDirectScreenEvent[] = [];
    subscriptions.push(
      pubsub
        .subscribe(ServerEvents.DIRECT_SCREEN_SIGNAL)
        .subscribe({ next: (event) => broadcasts.push(event) })
    );
    subscriptions.push(
      pubsub
        .subscribeFor(3, ServerEvents.DIRECT_SCREEN_SIGNAL)
        .subscribe({ next: (event) => others.push(event) })
    );
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: offer
    });
    expect(sending.events).toEqual([]);
    expect(receiving.events).toEqual([
      {
        sessionId: session.sessionId,
        channelId: 2,
        senderId: 1,
        fromUserId: 1,
        stunUrls: [],
        signal: offer
      }
    ]);
    await receiver.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: answer
    });
    await receiver.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'ready' }
    });
    expect(sending.events.map((event) => event.signal.type)).toEqual([
      'answer',
      'ready'
    ]);
    expect(broadcasts).toEqual([]);
    expect(others).toEqual([]);
    expect(
      testLogs.some(
        (entry) =>
          entry.message.includes(offer.sdp) ||
          entry.message.includes(answer.sdp)
      )
    ).toBe(false);
  });

  test('enforces direction and offer-answer-ready order without advancing on rejection', async () => {
    const { sender, receiver, session } = await prepared();
    const send = sender.voice.signalDirectScreen;
    const receive = receiver.voice.signalDirectScreen;
    await expect(
      receive({ sessionId: session.sessionId, signal: offer })
    ).rejects.toThrow();
    await expect(
      send({ sessionId: session.sessionId, signal: answer })
    ).rejects.toThrow();
    await expect(
      send({ sessionId: session.sessionId, signal: { type: 'ready' } })
    ).rejects.toThrow();
    await expect(
      receive({ sessionId: session.sessionId, signal: answer })
    ).rejects.toThrow();
    await expect(
      receive({ sessionId: session.sessionId, signal: { type: 'ready' } })
    ).rejects.toThrow();
    await send({ sessionId: session.sessionId, signal: offer });
    await expect(
      send({ sessionId: session.sessionId, signal: offer })
    ).rejects.toThrow();
    await expect(
      receive({ sessionId: session.sessionId, signal: { type: 'ready' } })
    ).rejects.toThrow();
    await receive({ sessionId: session.sessionId, signal: answer });
    await expect(
      receive({ sessionId: session.sessionId, signal: answer })
    ).rejects.toThrow();
    await receive({ sessionId: session.sessionId, signal: { type: 'ready' } });
    await expect(
      receive({ sessionId: session.sessionId, signal: { type: 'ready' } })
    ).rejects.toThrow();
  });

  test('rejects unknown, oversized, malformed and unexpected signalling fields', async () => {
    const { sender, session } = await prepared();
    for (const signal of [
      { type: 'offer', sdp: '' },
      { type: 'offer', sdp: 'not SDP' },
      { type: 'offer', sdp: `v=0\r\n${'x'.repeat(65536)}` },
      {
        type: 'offer',
        sdp: 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n'
      },
      { type: 'candidate', candidate: 'private IP' },
      { type: 'stop', sdp: 'private SDP' },
      { type: 'ready', peerId: 3 }
    ])
      await expect(
        sender.voice.signalDirectScreen({
          sessionId: session.sessionId,
          signal
        } as never)
      ).rejects.toThrow();
    await expect(
      sender.voice.signalDirectScreen({ sessionId: '', signal: offer })
    ).rejects.toThrow();
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: 'not-a-uuid',
        signal: offer
      })
    ).rejects.toThrow();
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: crypto.randomUUID(),
        signal: offer
      })
    ).rejects.toThrow('Direct screen session not found');
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: offer
    });
  });

  test('rejects outsiders and cross-runtime session IDs without disclosing the session', async () => {
    const { sender, session } = await prepared();
    const { caller: outsider } = await initTest(3, undefined, {
      currentVoiceChannelId: 2
    });
    await expect(
      outsider.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: offer
      })
    ).rejects.toThrow('Direct screen session not found');
    for (const signal of [{ type: 'fallback' }, { type: 'stop' }] as const) {
      await outsider.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal
      });
      await outsider.voice.signalDirectScreen({
        sessionId: crypto.randomUUID(),
        signal
      });
    }
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: offer
    });
    const runtime = new VoiceRuntime(4);
    runtimes.push(runtime);
    runtime.addUser(1, { micMuted: false, soundMuted: false });
    const { caller: elsewhere } = await initTest(1, undefined, {
      currentVoiceChannelId: 4
    });
    await expect(
      elsewhere.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: offer
      })
    ).rejects.toThrow('Direct screen session not found');
  });

  for (const permission of [
    Permission.JOIN_VOICE_CHANNELS,
    Permission.SHARE_SCREEN
  ]) {
    test(`checks global ${permission} before signalling`, async () => {
      const { receiver, session } = await prepared();
      const outgoing =
        permission === Permission.SHARE_SCREEN
          ? await receiver.voice.startDirectScreen({})
          : session;
      await revoke(permission);
      await expect(
        receiver.voice.signalDirectScreen({
          sessionId: outgoing!.sessionId,
          signal: permission === Permission.SHARE_SCREEN ? offer : answer
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  }

  test('permits terminal cleanup after disabling the feature, once only', async () => {
    const { sender, sending, receiving, session } = await prepared();
    config.webRtc.directScreenSharing = false;
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: offer
      })
    ).rejects.toThrow();
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'fallback' }
    });
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'stop' }
    });
    expect(sending.events.map((event) => event.signal.type)).toEqual([
      'fallback'
    ]);
    expect(receiving.events.map((event) => event.signal.type)).toEqual([
      'fallback'
    ]);
    await sender.voice.signalDirectScreen({
      sessionId: crypto.randomUUID(),
      signal: { type: 'stop' }
    });
  });

  test('rate limits invalid signalling requests', async () => {
    const { sender } = await pair();
    const sessionId = crypto.randomUUID();
    for (
      let index = 0;
      index < config.rateLimiters.voiceStream.maxRequests;
      index++
    ) {
      await expect(
        sender.voice.signalDirectScreen({ sessionId, signal: offer })
      ).rejects.toThrow('Direct screen session not found');
    }
    await expect(
      sender.voice.signalDirectScreen({ sessionId, signal: offer })
    ).rejects.toThrow('Too many requests');
  });
});

describe('direct screen lifecycle', () => {
  for (const action of [
    'leave',
    'move',
    'subscription',
    'capture',
    'destroy',
    'external'
  ] as const) {
    test(`ends sessions on ${action} without stale session resurrection`, async () => {
      const { runtime, sender, receiver, sending, receiving, session } =
        await prepared();
      if (action === 'leave') runtime.removeUser(2);
      if (action === 'move')
        await sender.voice.moveUser({ userId: 2, channelId: 4 });
      if (action === 'subscription') receiving.subscription.unsubscribe();
      if (action === 'capture')
        await sender.voice.updateState({ sharingScreen: false });
      if (action === 'destroy') await runtime.destroy();
      if (action === 'external')
        runtime.createExternalStream({
          title: 'external',
          key: 'key',
          pluginId: 'plugin',
          producers: {}
        });
      expect(sending.events.map((event) => event.signal.type)).toEqual([
        action === 'capture' || action === 'destroy' ? 'stop' : 'fallback'
      ]);
      if (action !== 'subscription') expect(receiving.events).toHaveLength(1);
      await expect(
        sender.voice.signalDirectScreen({
          sessionId: session.sessionId,
          signal: offer
        })
      ).rejects.toThrow();
      await sender.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: { type: 'stop' }
      });
      await receiver.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: { type: 'fallback' }
      });
    });
  }

  test('a returning participant needs a new live capability registration', async () => {
    const { runtime, sender, session } = await prepared();
    runtime.removeUser(2);
    runtime.addUser(2, { micMuted: false, soundMuted: false });
    expect(await sender.voice.startDirectScreen({})).toBeNull();
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: offer
      })
    ).rejects.toThrow('Direct screen session not found');
  });

  test('expires a pending session and frees the outgoing slot', async () => {
    const time = clock();
    const { sender, sending, session } = await prepared();
    time.advance(8200);
    expect(sending.events.map((event) => event.signal.type)).toEqual([
      'fallback'
    ]);
    await expect(
      sender.voice.signalDirectScreen({
        sessionId: session.sessionId,
        signal: offer
      })
    ).rejects.toThrow('Direct screen session not found');
    const replacement = await sender.voice.startDirectScreen({});
    expect(replacement).not.toBeNull();
    await sender.voice.signalDirectScreen({
      sessionId: replacement!.sessionId,
      signal: { type: 'stop' }
    });
  });

  test('ready clears the pending deadline', async () => {
    const time = clock();
    const { sender, receiver, sending, session } = await prepared();
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: offer
    });
    await receiver.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: answer
    });
    await receiver.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'ready' }
    });
    time.advance(8200);
    expect(sending.events.map((event) => event.signal.type)).toEqual([
      'answer',
      'ready'
    ]);
    await sender.voice.signalDirectScreen({
      sessionId: session.sessionId,
      signal: { type: 'stop' }
    });
    expect(sending.events.at(-1)?.signal.type).toBe('stop');
  });
});

test('all direct screen endpoints require authentication', async () => {
  const { caller } = await getCaller(1, undefined, { authenticated: false });
  await expect(caller.voice.startDirectScreen({})).rejects.toThrow(
    'You must be authenticated'
  );
  await expect(
    caller.voice.onDirectScreenSignal({ enabled: true })
  ).rejects.toThrow('You must be authenticated');
  await expect(
    caller.voice.signalDirectScreen({
      sessionId: crypto.randomUUID(),
      signal: { type: 'stop' }
    })
  ).rejects.toThrow('You must be authenticated');
});

test('screen signalling rechecks channel permissions before exposing SDP', async () => {
  const { sender, receiver } = await pair(4);
  await tdb.insert(channelRolePermissions).values([
    {
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: true,
      createdAt: Date.now()
    },
    {
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.SHARE_SCREEN,
      allow: true,
      createdAt: Date.now()
    }
  ]);
  const sending = await listen(sender);
  const receiving = await listen(receiver);
  const session = await sender.voice.startDirectScreen({});
  await tdb
    .delete(channelRolePermissions)
    .where(eq(channelRolePermissions.channelId, 4));
  await expect(
    sender.voice.signalDirectScreen({
      sessionId: session!.sessionId,
      signal: offer
    })
  ).rejects.toThrow('Direct screen session not found');
  expect(receiving.events.map((event) => event.signal.type)).toEqual([
    'fallback'
  ]);
  expect(sending.events.map((event) => event.signal.type)).toEqual([
    'fallback'
  ]);
});

test('screen offers need channel share permission but receive and cleanup do not', async () => {
  const { sender, receiver } = await pair(4);
  await tdb.insert(channelRolePermissions).values([
    {
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: true,
      createdAt: Date.now()
    },
    {
      channelId: 4,
      roleId: 2,
      permission: ChannelPermission.SHARE_SCREEN,
      allow: true,
      createdAt: Date.now()
    }
  ]);
  await listen(sender);
  await listen(receiver);
  const session = await sender.voice.startDirectScreen({});
  const opposite = await receiver.voice.startDirectScreen({});
  await sender.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: offer
  });
  await tdb
    .delete(channelRolePermissions)
    .where(
      and(
        eq(channelRolePermissions.channelId, 4),
        eq(channelRolePermissions.permission, ChannelPermission.SHARE_SCREEN)
      )
    );
  await expect(
    receiver.voice.signalDirectScreen({
      sessionId: opposite!.sessionId,
      signal: offer
    })
  ).rejects.toThrow('Insufficient channel permissions');
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: answer
  });
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: { type: 'ready' }
  });
  await receiver.voice.signalDirectScreen({
    sessionId: opposite!.sessionId,
    signal: { type: 'stop' }
  });
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: { type: 'fallback' }
  });
});

test('a receive-only peer without global share permission can negotiate and clean up', async () => {
  const { sender, receiver } = await pair();
  await revoke(Permission.SHARE_SCREEN);
  const sending = await listen(sender);
  await listen(receiver);
  const session = await sender.voice.startDirectScreen({});
  await sender.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: offer
  });
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: answer
  });
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: { type: 'ready' }
  });
  expect(sending.events.map((event) => event.signal.type)).toEqual([
    'answer',
    'ready'
  ]);
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: { type: 'stop' }
  });
  await receiver.voice.signalDirectScreen({
    sessionId: session!.sessionId,
    signal: { type: 'fallback' }
  });
  await expect(receiver.voice.startDirectScreen({})).rejects.toThrow(
    'Insufficient permissions'
  );
});
