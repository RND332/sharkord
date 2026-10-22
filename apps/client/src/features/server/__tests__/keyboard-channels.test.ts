import type { IRootState } from '@/features/store';
import {
  ChannelPermission,
  ChannelType,
  OWNER_ROLE_ID,
  type TChannel
} from '@dodecagon/shared';
import { describe, expect, test } from 'bun:test';
import { navigableTextChannelsSelector } from '../selectors';

const channels: TChannel[] = [
  { id: 1, categoryId: 1, position: 1, type: ChannelType.TEXT },
  { id: 2, categoryId: 1, position: 0, type: ChannelType.VOICE },
  { id: 3, categoryId: 2, position: 0, type: ChannelType.TEXT },
  { id: 4, categoryId: 1, position: 0, type: ChannelType.TEXT, private: true },
  { id: 5, categoryId: 1, position: 1, type: ChannelType.TEXT },
  { id: 6, categoryId: null, position: 0, type: ChannelType.TEXT, isDm: true }
].map((channel) => ({
  name: `channel-${channel.id}`,
  topic: null,
  createdAt: 0,
  updatedAt: null,
  private: false,
  isDm: false,
  ...channel
}));

const stateWith = (owner = false, allowPrivate = false) =>
  ({
    server: {
      channels,
      categories: [
        { id: 1, position: 1 },
        { id: 2, position: 0 }
      ],
      roles: [{ id: OWNER_ROLE_ID }],
      users: [{ id: 1, name: 'User', roleIds: owner ? [OWNER_ROLE_ID] : [] }],
      ownUserId: 1,
      channelPermissions: {
        4: { permissions: { [ChannelPermission.VIEW_CHANNEL]: allowPrivate } }
      }
    }
  }) as unknown as IRootState;

const ids = (state: IRootState) => {
  const result = navigableTextChannelsSelector(state);
  return result.map(({ id }) => id);
};

describe('keyboard channel navigation', () => {
  test('follows sidebar category order and channel position with stable id tie breaking', () => {
    expect(ids(stateWith())).toEqual([3, 1, 5]);
  });

  test('includes only accessible text channels, never DMs or other voice rooms', () => {
    expect(ids(stateWith(false, true))).toEqual([3, 4, 1, 5]);
  });

  test('preserves owner access to private channels', () => {
    expect(ids(stateWith(true))).toEqual([3, 4, 1, 5]);
  });

  test('keeps the same reference for unrelated state updates', () => {
    const state = stateWith();
    const first = navigableTextChannelsSelector(state);
    const next = {
      ...state,
      server: { ...state.server, selectedChannelId: 5 }
    };
    expect(navigableTextChannelsSelector(next)).toBe(first);
  });
});
