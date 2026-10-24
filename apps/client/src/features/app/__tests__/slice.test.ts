import { describe, expect, test } from 'bun:test';
import { appInitialState, appSliceActions, appSliceReducer } from '../slice';

const stateWithEveryDock = () => ({
  ...appInitialState,
  threadSidebarOpen: true,
  threadParentMessageId: 5,
  threadChannelId: 1,
  voiceChatSidebarOpen: true,
  voiceChatChannelId: 2,
  membersPanelOpen: true
});

describe('right dock exclusivity', () => {
  test('should close the voice chat and the members panel when a thread opens', () => {
    const state = appSliceReducer(
      stateWithEveryDock(),
      appSliceActions.setThreadSidebarOpen({
        open: true,
        parentMessageId: 5,
        channelId: 1
      })
    );

    expect(state.threadSidebarOpen).toBe(true);
    expect(state.voiceChatSidebarOpen).toBe(false);
    expect(state.membersPanelOpen).toBe(false);
  });

  test('should close the thread and the members panel when the voice chat opens', () => {
    const state = appSliceReducer(
      stateWithEveryDock(),
      appSliceActions.setVoiceChatSidebar({ open: true, channelId: 2 })
    );

    expect(state.voiceChatSidebarOpen).toBe(true);
    expect(state.threadSidebarOpen).toBe(false);
    expect(state.threadParentMessageId).toBeUndefined();
    expect(state.threadChannelId).toBeUndefined();
    expect(state.membersPanelOpen).toBe(false);
  });

  test('should close the thread and the voice chat when the members panel opens', () => {
    const state = appSliceReducer(
      stateWithEveryDock(),
      appSliceActions.setMembersPanelOpen(true)
    );

    expect(state.membersPanelOpen).toBe(true);
    expect(state.threadSidebarOpen).toBe(false);
    expect(state.threadParentMessageId).toBeUndefined();
    expect(state.threadChannelId).toBeUndefined();
    expect(state.voiceChatSidebarOpen).toBe(false);
  });

  test('should leave the other docks alone when a dock closes', () => {
    const state = appSliceReducer(
      stateWithEveryDock(),
      appSliceActions.setVoiceChatSidebar({ open: false, channelId: 2 })
    );

    expect(state.voiceChatSidebarOpen).toBe(false);
    expect(state.threadSidebarOpen).toBe(true);
    expect(state.membersPanelOpen).toBe(true);
  });
});
