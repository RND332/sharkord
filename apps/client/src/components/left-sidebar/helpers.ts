import { createContext } from 'react';

export type TVoiceChannelAction = 'chat' | 'settings';

// the voice channel has no context menu, its actions show up on hover of the row:
// the chat opens the text chat of the channel, the settings open the channel
// settings screen. the settings screen has no section without a channel
// permission, so the settings action needs one
export const getVoiceChannelActions = (
  canEditChannel: boolean
): TVoiceChannelAction[] => {
  const actions: TVoiceChannelAction[] = ['chat'];

  if (canEditChannel) {
    actions.push('settings');
  }

  return actions;
};

export const VOICE_USER_DND_MIME = 'application/x-dodecagon-user-id';

export const categoryDndId = (categoryId: number) => `category:${categoryId}`;

export const channelDndId = (channelId: number) => `channel:${channelId}`;

export const categoryDropDndId = (categoryId: number) =>
  `category-drop:${categoryId}`;

export type TSidebarDragData =
  | { type: 'category'; categoryId: number }
  | { type: 'channel'; channelId: number; categoryId: number }
  | { type: 'category-drop'; categoryId: number };

export type TChannelDragPreview = {
  channelId: number;
  categoryId: number;
  index: number;
};

export const ChannelDragPreviewContext =
  createContext<TChannelDragPreview | null>(null);

export const applyChannelDragPreview = (
  channelIds: number[],
  categoryId: number,
  preview: TChannelDragPreview | null
) => {
  if (!preview) {
    return channelIds;
  }

  const withoutDraggedChannel = channelIds.filter(
    (channelId) => channelId !== preview.channelId
  );

  if (preview.categoryId !== categoryId) {
    return withoutDraggedChannel;
  }

  withoutDraggedChannel.splice(preview.index, 0, preview.channelId);

  return withoutDraggedChannel;
};
