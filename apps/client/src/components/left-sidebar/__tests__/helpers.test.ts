import { describe, expect, test } from 'bun:test';
import { getVoiceChannelActions } from '../helpers';

describe('getVoiceChannelActions', () => {
  // the chat is always there, it opens the text chat of the voice channel
  test('should offer the chat action to every user', () => {
    expect(getVoiceChannelActions(false)).toEqual(['chat']);
  });

  // the channel settings screen has no section without a channel permission
  test('should offer the settings action to a user who can edit the channel', () => {
    expect(getVoiceChannelActions(true)).toEqual(['chat', 'settings']);
  });
});
