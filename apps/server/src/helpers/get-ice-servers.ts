import type { TIceServer } from '@dodecagon/shared';
import { createHmac } from 'node:crypto';
import { config } from '../config';

// TURN REST API credentials: coturn validates the HMAC itself, so the shared
// secret never leaves the server and every client gets short lived credentials.
const getIceServers = (userId: number): TIceServer[] => {
  const iceServers: TIceServer[] = [];
  const { directScreenStunUrls, turnUrls, turnSecret, turnTtl } = config.webRtc;

  if (directScreenStunUrls.length > 0) {
    iceServers.push({ urls: [...directScreenStunUrls] });
  }

  if (turnUrls.length > 0 && turnSecret) {
    const username = `${Math.floor(Date.now() / 1000) + turnTtl}:${userId}`;
    const credential = createHmac('sha1', turnSecret)
      .update(username)
      .digest('base64');

    iceServers.push({
      urls: [...turnUrls],
      username,
      credential
    });
  }

  return iceServers;
};

export { getIceServers };
