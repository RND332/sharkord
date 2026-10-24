// Runs the dock preference scenarios in their own process: bun keeps the first
// mock.module registration of a path for the whole test run, so the mocks of
// the other test files would leak into the modules of the app.
import { setStoreState, store } from '@/features/store';
import { LocalStorageKey } from '@/helpers/storage';
import {
  openThreadSidebar,
  openVoiceChatSidebar,
  setMembersPanelOpen
} from '../actions';
import {
  appInitialState,
  appSliceReducer,
  hydrateAppFromStorage
} from '../slice';

const items = new Map<string, string>();

class MemoryStorage {
  get length() {
    return items.size;
  }

  clear() {
    items.clear();
  }

  getItem(key: string) {
    return items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    items.delete(key);
  }

  setItem(key: string, value: string) {
    items.set(key, value);
  }
}

globalThis.localStorage = new MemoryStorage() as unknown as Storage;

type TScenario = {
  voiceChatOpen: boolean;
  membersOpen: boolean;
  threadOpen: boolean;
  voiceChatFlag: string | null;
  membersFlag: string | null;
  restoredVoiceChatOpen: boolean;
  restoredMembersOpen: boolean;
  restoredThreadOpen: boolean;
};

const run = (steps: (() => void)[]): TScenario => {
  items.clear();
  setStoreState({ app: appInitialState });

  for (const step of steps) {
    step();
  }

  const state = store.getState().app;
  const restored = appSliceReducer(appInitialState, hydrateAppFromStorage());

  return {
    voiceChatOpen: state.voiceChatSidebarOpen,
    membersOpen: state.membersPanelOpen,
    threadOpen: state.threadSidebarOpen,
    voiceChatFlag: localStorage.getItem(
      LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE
    ),
    membersFlag: localStorage.getItem(LocalStorageKey.RIGHT_SIDEBAR_STATE),
    restoredVoiceChatOpen: restored.voiceChatSidebarOpen,
    restoredMembersOpen: restored.membersPanelOpen,
    restoredThreadOpen: restored.threadSidebarOpen
  };
};

const scenarios = {
  voiceChat: run([
    () => setMembersPanelOpen(true),
    () => openVoiceChatSidebar(2)
  ]),
  members: run([
    () => openVoiceChatSidebar(2),
    () => setMembersPanelOpen(true)
  ]),
  thread: run([() => openVoiceChatSidebar(2), () => openThreadSidebar(5, 1)]),
  membersOnly: run([() => setMembersPanelOpen(true)]),
  legacyConflict: run([
    () =>
      localStorage.setItem(LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE, 'true'),
    () => localStorage.setItem(LocalStorageKey.RIGHT_SIDEBAR_STATE, 'true')
  ])
};

console.log(`__DOCKS__${JSON.stringify(scenarios)}`);
