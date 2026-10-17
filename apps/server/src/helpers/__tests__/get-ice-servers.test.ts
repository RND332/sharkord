import { afterEach, describe, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { config } from '../../config';
import { getIceServers } from '../get-ice-servers';

const originalWebRtc = { ...config.webRtc };

afterEach(() => {
  config.webRtc.directScreenStunUrls = originalWebRtc.directScreenStunUrls;
  config.webRtc.turnUrls = originalWebRtc.turnUrls;
  config.webRtc.turnSecret = originalWebRtc.turnSecret;
  config.webRtc.turnTtl = originalWebRtc.turnTtl;
});

describe('getIceServers', () => {
  test('returns nothing when no ICE servers are configured', () => {
    config.webRtc.directScreenStunUrls = [];
    config.webRtc.turnUrls = [];
    config.webRtc.turnSecret = '';

    expect(getIceServers(7)).toEqual([]);
  });

  test('returns STUN and TURN REST credentials with the user scoped username', () => {
    config.webRtc.directScreenStunUrls = ['stun:stun.example.org:3478'];
    config.webRtc.turnUrls = ['turn:turn.example.org:3478'];
    config.webRtc.turnSecret = 'test-turn-secret-0123456789';
    config.webRtc.turnTtl = 3600;

    const before = Math.floor(Date.now() / 1000);
    const servers = getIceServers(7);

    expect(servers[0]).toEqual({
      urls: ['stun:stun.example.org:3478']
    });
    const turn = servers[1]!;
    expect(turn.urls).toEqual(['turn:turn.example.org:3478']);
    expect(turn.username).toMatch(/^\d+:7$/);
    const expiresAt = Number(turn.username!.split(':')[0]);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3600);
    expect(expiresAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600);
    expect(turn.credential).toBe(
      createHmac('sha1', config.webRtc.turnSecret)
        .update(turn.username!)
        .digest('base64')
    );
  });

  test('does not issue TURN credentials without the shared secret', () => {
    config.webRtc.directScreenStunUrls = [];
    config.webRtc.turnUrls = ['turn:turn.example.org:3478'];
    config.webRtc.turnSecret = '';

    expect(getIceServers(7)).toEqual([]);
  });
});
