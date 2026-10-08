import type { IceCandidate, IceParameters } from 'mediasoup/types';
import type { StreamKind, TExternalStreamTracks } from './types';

export type { ConsumerType } from 'mediasoup/types';

export type TVoiceUserState = {
  micMuted: boolean;
  soundMuted: boolean;
  webcamEnabled: boolean;
  sharingScreen: boolean;
  voiceOnlyMode?: boolean;
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

export type TTransportParams = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: any;
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

export const DIRECT_SCREEN_CONNECT_TIMEOUT_MS = 8000;
export const DIRECT_SCREEN_ICE_GATHER_TIMEOUT_MS = 2000;
export const DIRECT_SCREEN_SDP_MAX_LENGTH = 65536;

export type TDirectScreenSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ready' }
  | { type: 'fallback' }
  | { type: 'stop' };

export type TDirectScreenSession = {
  sessionId: string;
  peerId: number;
  stunUrls: string[];
};

export type TDirectScreenEvent = {
  sessionId: string;
  channelId: number;
  senderId: number;
  fromUserId: number;
  stunUrls: string[];
  signal: TDirectScreenSignal;
};
