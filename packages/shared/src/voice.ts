import type { IceCandidate, IceParameters } from 'mediasoup/types';
import { StreamKind, type TExternalStreamTracks } from './types';

export type { ConsumerType } from 'mediasoup/types';

export type TVoiceUserState = {
  micMuted: boolean;
  soundMuted: boolean;
  webcamEnabled: boolean;
  sharingScreen: boolean;
  voiceOnlyMode?: boolean;
  directMediaEnabled?: boolean;
};

export type TVoiceUser = {
  userId: number;
  state: TVoiceUserState;
};

export type TExternalStream = {
  title: string;
  key: string;
  pluginId: string;
  avatarUrl?: string;
  bannerUrl?: string;
  tracks: TExternalStreamTracks;
};

export type TChannelState = {
  users: TVoiceUser[];
  externalStreams: { [streamId: number]: TExternalStream };
};

export type TIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type TTransportParams = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: any;
  iceServers?: TIceServer[];
};

export type TVoiceMap = {
  [channelId: number]: {
    users: {
      [userId: number]: TVoiceUserState;
    };
  };
};

export type TExternalStreamsMap = {
  [channelId: number]: {
    [streamId: number]: TExternalStream;
  };
};

export type TVoiceProducerInfo = {
  userId: number;
  kind: StreamKind;
  producerId: string;
  paused: boolean;
};

// the client waits longer than the server so a server fallback always wins the race
export const DIRECT_MEDIA_CONNECT_TIMEOUT_MS = 8000;
export const DIRECT_MEDIA_AUDIO_CONNECT_TIMEOUT_MS = 5000;
export const DIRECT_MEDIA_SERVER_CONNECT_TIMEOUT_MS = 7500;
export const DIRECT_MEDIA_SERVER_AUDIO_CONNECT_TIMEOUT_MS = 4500;
export const DIRECT_MEDIA_ICE_GATHER_TIMEOUT_MS = 2000;
export const DIRECT_MEDIA_SDP_MAX_LENGTH = 65536;

export const DIRECT_MEDIA_KINDS = [
  StreamKind.AUDIO,
  StreamKind.VIDEO,
  StreamKind.SCREEN
] as const;
export type TDirectMediaKind = (typeof DIRECT_MEDIA_KINDS)[number];

export type TDirectMediaSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ready' }
  | { type: 'fallback' }
  | { type: 'stop' };

export type TDirectMediaSession = {
  kind: TDirectMediaKind;
  sessionId: string;
  peerId: number;
  iceServers: TIceServer[];
};

export type TDirectMediaEvent = {
  kind: TDirectMediaKind;
  relayAllowed: boolean;
  sessionId: string;
  channelId: number;
  senderId: number;
  fromUserId: number;
  iceServers: TIceServer[];
  signal: TDirectMediaSignal;
};
