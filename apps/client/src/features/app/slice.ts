import {
  getLocalStorageItemAsJSON,
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  LocalStorageKey
} from '@/helpers/storage';
import type { TDevices, TMessageJumpToTarget } from '@/types';
import { produce } from 'immer';

export interface TAppState {
  appLoading: boolean;
  isAutoConnecting: boolean;
  loadingPlugins: boolean;
  devices: TDevices | undefined;
  modViewOpen: boolean;
  modViewUserId: number | undefined;
  threadSidebarOpen: boolean;
  threadParentMessageId: number | undefined;
  threadChannelId: number | undefined;
  autoJoinLastChannel: boolean;
  selectedDmChannelId: number | undefined;
  browserNotifications: boolean;
  browserNotificationsForMentions: boolean;
  browserNotificationsForDms: boolean;
  browserNotificationsForReplies: boolean;
  notificationSounds: boolean;
  messageSentSound: boolean;
  joinLeaveSounds: boolean;
  muteDeafenSounds: boolean;
  mutedChannelIds: number[];
  messageJumpTarget: TMessageJumpToTarget | undefined;
  voiceChatSidebarOpen: boolean;
  voiceChatChannelId: number | undefined;
  pluginSlotDebug: boolean;
  modifierKeysHeldMap: Record<string, boolean>;
}

const initialState: TAppState = {
  appLoading: true,
  isAutoConnecting: false,
  loadingPlugins: true,
  devices: undefined,
  modViewOpen: false,
  modViewUserId: undefined,
  threadSidebarOpen: false,
  threadParentMessageId: undefined,
  threadChannelId: undefined,
  autoJoinLastChannel: getLocalStorageItemBool(
    LocalStorageKey.AUTO_JOIN_LAST_CHANNEL,
    false
  ),
  selectedDmChannelId: undefined,
  browserNotifications: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS,
    false
  ),
  browserNotificationsForMentions: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_MENTIONS,
    false
  ),
  browserNotificationsForDms: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_DMS,
    false
  ),
  browserNotificationsForReplies: getLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_REPLIES,
    false
  ),
  notificationSounds: getLocalStorageItemBool(
    LocalStorageKey.NOTIFICATION_SOUNDS,
    true
  ),
  messageSentSound: getLocalStorageItemBool(
    LocalStorageKey.MESSAGE_SENT_SOUND,
    true
  ),
  joinLeaveSounds: getLocalStorageItemBool(
    LocalStorageKey.JOIN_LEAVE_SOUNDS,
    true
  ),
  muteDeafenSounds: getLocalStorageItemBool(
    LocalStorageKey.MUTE_DEAFEN_SOUNDS,
    true
  ),
  mutedChannelIds:
    getLocalStorageItemAsJSON<number[]>(LocalStorageKey.MUTED_CHANNEL_IDS) ??
    [],
  messageJumpTarget: undefined,
  voiceChatSidebarOpen: getLocalStorageItemBool(
    LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE,
    false
  ),
  voiceChatChannelId: getLocalStorageItemAsNumber(
    LocalStorageKey.VOICE_CHAT_SIDEBAR_CHANNEL_ID
  ),
  pluginSlotDebug: getLocalStorageItemBool(
    LocalStorageKey.PLUGIN_SLOT_DEBUG,
    false
  ),
  modifierKeysHeldMap: { Shift: false, Control: false, Alt: false }
};

const appSliceActions = {
  setAppLoading: (payload: boolean) =>
    ({ type: 'app/setAppLoading', payload }) as const,
  setDevices: (payload: TDevices) =>
    ({ type: 'app/setDevices', payload }) as const,
  setLoadingPlugins: (payload: boolean) =>
    ({ type: 'app/setLoadingPlugins', payload }) as const,
  setModViewOpen: (payload: { modViewOpen: boolean; userId?: number }) =>
    ({ type: 'app/setModViewOpen', payload }) as const,
  setThreadSidebarOpen: (payload: {
    open: boolean;
    parentMessageId?: number;
    channelId?: number;
  }) => ({ type: 'app/setThreadSidebarOpen', payload }) as const,
  setAutoJoinLastChannel: (payload: boolean) =>
    ({ type: 'app/setAutoJoinLastChannel', payload }) as const,
  setIsAutoConnecting: (payload: boolean) =>
    ({ type: 'app/setIsAutoConnecting', payload }) as const,
  setSelectedDmChannelId: (payload: number | undefined) =>
    ({ type: 'app/setSelectedDmChannelId', payload }) as const,
  setBrowserNotifications: (payload: boolean) =>
    ({ type: 'app/setBrowserNotifications', payload }) as const,
  setBrowserNotificationsForMentions: (payload: boolean) =>
    ({ type: 'app/setBrowserNotificationsForMentions', payload }) as const,
  setBrowserNotificationsForDms: (payload: boolean) =>
    ({ type: 'app/setBrowserNotificationsForDms', payload }) as const,
  setBrowserNotificationsForReplies: (payload: boolean) =>
    ({ type: 'app/setBrowserNotificationsForReplies', payload }) as const,
  setNotificationSounds: (payload: boolean) =>
    ({ type: 'app/setNotificationSounds', payload }) as const,
  setMessageSentSound: (payload: boolean) =>
    ({ type: 'app/setMessageSentSound', payload }) as const,
  setJoinLeaveSounds: (payload: boolean) =>
    ({ type: 'app/setJoinLeaveSounds', payload }) as const,
  setMuteDeafenSounds: (payload: boolean) =>
    ({ type: 'app/setMuteDeafenSounds', payload }) as const,
  setMutedChannelIds: (payload: number[]) =>
    ({ type: 'app/setMutedChannelIds', payload }) as const,
  setMessageJumpTarget: (payload: TMessageJumpToTarget | undefined) =>
    ({ type: 'app/setMessageJumpTarget', payload }) as const,
  setVoiceChatSidebar: (payload: { open: boolean; channelId?: number }) =>
    ({ type: 'app/setVoiceChatSidebar', payload }) as const,
  setPluginSlotDebug: (payload: boolean) =>
    ({ type: 'app/setPluginSlotDebug', payload }) as const,
  setModifierKeysHeldMap: (payload: Record<string, boolean>) =>
    ({ type: 'app/setModifierKeysHeldMap', payload }) as const
};

export type TAppAction = ReturnType<
  (typeof appSliceActions)[keyof typeof appSliceActions]
>;

const appSliceReducer = (state: TAppState, action: TAppAction): TAppState =>
  produce(state, (draft) => {
    switch (action.type) {
      case 'app/setAppLoading':
        draft.appLoading = action.payload;
        break;
      case 'app/setDevices':
        draft.devices = action.payload;
        break;
      case 'app/setLoadingPlugins':
        draft.loadingPlugins = action.payload;
        break;
      case 'app/setModViewOpen':
        draft.modViewOpen = action.payload.modViewOpen;
        draft.modViewUserId = action.payload.userId;
        break;
      case 'app/setThreadSidebarOpen':
        draft.threadSidebarOpen = action.payload.open;
        draft.threadParentMessageId = action.payload.parentMessageId;
        draft.threadChannelId = action.payload.channelId;
        break;
      case 'app/setAutoJoinLastChannel':
        draft.autoJoinLastChannel = action.payload;
        break;
      case 'app/setIsAutoConnecting':
        draft.isAutoConnecting = action.payload;
        break;
      case 'app/setSelectedDmChannelId':
        draft.selectedDmChannelId = action.payload;
        break;
      case 'app/setBrowserNotifications':
        draft.browserNotifications = action.payload;
        break;
      case 'app/setBrowserNotificationsForMentions':
        draft.browserNotificationsForMentions = action.payload;
        break;
      case 'app/setBrowserNotificationsForDms':
        draft.browserNotificationsForDms = action.payload;
        break;
      case 'app/setBrowserNotificationsForReplies':
        draft.browserNotificationsForReplies = action.payload;
        break;
      case 'app/setNotificationSounds':
        draft.notificationSounds = action.payload;
        break;
      case 'app/setMessageSentSound':
        draft.messageSentSound = action.payload;
        break;
      case 'app/setJoinLeaveSounds':
        draft.joinLeaveSounds = action.payload;
        break;
      case 'app/setMuteDeafenSounds':
        draft.muteDeafenSounds = action.payload;
        break;
      case 'app/setMutedChannelIds':
        draft.mutedChannelIds = action.payload;
        break;
      case 'app/setMessageJumpTarget':
        draft.messageJumpTarget = action.payload;
        break;
      case 'app/setVoiceChatSidebar':
        draft.voiceChatSidebarOpen = action.payload.open;
        draft.voiceChatChannelId = action.payload.channelId;
        break;
      case 'app/setPluginSlotDebug':
        draft.pluginSlotDebug = action.payload;
        break;
      case 'app/setModifierKeysHeldMap':
        draft.modifierKeysHeldMap = action.payload;
        break;
    }
  });

export { initialState as appInitialState, appSliceActions, appSliceReducer };
