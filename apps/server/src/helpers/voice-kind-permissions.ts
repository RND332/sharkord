import {
  ChannelPermission,
  Permission,
  StreamKind,
  type TProducibleStreamKind
} from '@dodecagon/shared';

const voiceKindPermissions: Record<
  TProducibleStreamKind,
  { channel: ChannelPermission; server?: Permission }
> = {
  [StreamKind.AUDIO]: { channel: ChannelPermission.SPEAK },
  [StreamKind.VIDEO]: {
    channel: ChannelPermission.WEBCAM,
    server: Permission.ENABLE_WEBCAM
  },
  [StreamKind.SCREEN]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  },
  [StreamKind.SCREEN_AUDIO]: {
    channel: ChannelPermission.SHARE_SCREEN,
    server: Permission.SHARE_SCREEN
  }
};

export { voiceKindPermissions };
