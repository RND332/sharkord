import { Dialog } from '@/components/dialogs/dialogs';
import { VoiceControl } from '@/components/left-sidebar/voice-control';
import '@fontsource-variable/inter';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../index.css';

const state = vi.hoisted(() => ({
  voiceChannelId: 42 as number | undefined,
  voiceServerModes: {} as Record<number, boolean>,
  storeListeners: [] as (() => void)[],
  events: [] as string[],
  canUseWebcam: true,
  canShareScreen: true,
  devices: {
    microphoneId: 'mic-1',
    playbackId: 'speaker-1',
    webcamId: 'camera-1',
    voiceOnlyMode: false
  },
  saveDevices: vi.fn(
    (
      _devices:
        | {
            microphoneId: string;
            playbackId: string;
            webcamId: string;
            voiceOnlyMode: boolean;
          }
        | ((current: {
            microphoneId: string;
            playbackId: string;
            webcamId: string;
            voiceOnlyMode: boolean;
          }) => {
            microphoneId: string;
            playbackId: string;
            webcamId: string;
            voiceOnlyMode: boolean;
          })
    ) => {}
  ),
  updateVoiceState: vi.fn(async (_state: { voiceOnlyMode: boolean }) => {}),
  openDialog: vi.fn(),
  toastError: vi.fn(),
  toggleWebcam: vi.fn(),
  toggleScreenShare: vi.fn()
}));

vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({
    devices: state.devices,
    saveDevices: state.saveDevices
  })
}));
vi.mock('@/features/server/channels/hooks', () => ({
  useChannelById: () => ({ name: 'Voice room' }),
  useCurrentVoiceChannelId: () => state.voiceChannelId
}));
vi.mock('@/features/server/hooks', () => ({
  useChannelCan: () => (permission: string) =>
    permission === 'WEBCAM' ? state.canUseWebcam : state.canShareScreen,
  useServerName: () => 'Test server'
}));
vi.mock('@/features/store', () => ({
  store: {
    getState: () => ({
      server: { currentVoiceChannelId: state.voiceChannelId }
    }),
    subscribe: (listener: () => void) => {
      state.storeListeners.push(listener);
      return () => {
        state.storeListeners = state.storeListeners.filter(
          (current) => current !== listener
        );
      };
    }
  }
}));
vi.mock('@/features/server/voice/hooks', () => ({
  useVoice: () => ({
    ownVoiceState: { webcamEnabled: false, sharingScreen: false },
    toggleWebcam: state.toggleWebcam,
    toggleScreenShare: state.toggleScreenShare,
    connectionStatus: 'connected',
    isScreenShareSupported: true
  })
}));
vi.mock('@/features/server/voice/actions', () => ({ leaveVoice: vi.fn() }));
vi.mock('@/features/dialogs/actions', () => ({
  openDialog: state.openDialog
}));
vi.mock('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    voice: { updateState: { mutate: state.updateVoiceState } }
  })
}));
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>();
  return {
    ...actual,
    toast: { ...actual.toast, error: state.toastError }
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        voiceConnecting: 'Voice connecting',
        voiceConnected: 'Voice connected',
        voiceFailed: 'Voice failed',
        voiceDisconnected: 'Voice disconnected',
        disconnectVoice: 'Disconnect voice',
        voiceDiagnostics: 'Voice diagnostics',
        'settings:voiceOnlyModeLabel': 'Voice-only mode',
        'settings:voiceOnlyModeDesc':
          'Send and receive microphone audio only; cameras, screen sharing, and external media are disabled.',
        'settings:failedSaveDeviceSettings': 'Could not save device settings',
        turnOffCamera: 'Turn off camera',
        turnOnCamera: 'Turn on camera',
        stopScreenShare: 'Stop screen share',
        startScreenShare: 'Start screen share'
      })[key] ?? key
  })
}));
vi.mock('@/components/channel-view/voice/voice-audio-streams', () => ({
  VoiceAudioStreams: () => null
}));
vi.mock('@/components/channel-view/voice/external-audio-streams', () => ({
  ExternalAudioStreams: () => null
}));
vi.mock('@/components/plugin-slot-renderer', () => ({
  PluginSlotRenderer: () => null
}));

let root: Root | undefined;
let host: HTMLDivElement | undefined;
let remountVersion = 0;
const originalDevices = {
  microphoneId: 'mic-1',
  playbackId: 'speaker-1',
  webcamId: 'camera-1',
  voiceOnlyMode: false
};

const setVoiceChannelId = (voiceChannelId: number | undefined) => {
  state.voiceChannelId = voiceChannelId;
  state.storeListeners.forEach((listener) => listener());
};

const render = async (remount = false) => {
  document.documentElement.classList.add('dark');
  if (!root) {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:252px;height:78px';
    document.body.append(host);
    root = createRoot(host);
  }
  root.render(
    remount
      ? createElement(VoiceControl, { key: ++remountVersion })
      : createElement(VoiceControl)
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};

afterEach(() => {
  root?.unmount();
  root = undefined;
  host = undefined;
  document.body.replaceChildren();
  document.documentElement.classList.remove('dark');
  state.devices = { ...originalDevices };
  state.voiceChannelId = 42;
  remountVersion = 0;
  state.voiceServerModes = {};
  state.storeListeners = [];
  state.events = [];
  state.canUseWebcam = true;
  state.canShareScreen = true;
  state.saveDevices.mockReset();
  state.saveDevices.mockImplementation((devices) => {
    state.devices =
      typeof devices === 'function' ? devices(state.devices) : devices;
    state.events.push(`save:${state.devices.voiceOnlyMode}`);
  });
  state.updateVoiceState.mockReset();
  state.updateVoiceState.mockImplementation(async (nextState) => {
    const channelId = state.voiceChannelId;
    if (channelId === undefined) return;
    state.voiceServerModes[channelId] = nextState.voiceOnlyMode;
    state.events.push(`server:${channelId}:${nextState.voiceOnlyMode}`);
  });
  state.openDialog.mockReset();
  state.toastError.mockReset();
  state.toggleWebcam.mockReset();
  state.toggleScreenShare.mockReset();
});

state.saveDevices.mockImplementation((devices) => {
  state.devices =
    typeof devices === 'function' ? devices(state.devices) : devices;
  state.events.push(`save:${state.devices.voiceOnlyMode}`);
});
state.updateVoiceState.mockImplementation(async (nextState) => {
  const channelId = state.voiceChannelId;
  if (channelId === undefined) return;
  state.voiceServerModes[channelId] = nextState.voiceOnlyMode;
  state.events.push(`server:${channelId}:${nextState.voiceOnlyMode}`);
});

test('eye toggles the existing mode after the server accepts and preserves device settings', async () => {
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'false');

  await modeButton.click();
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));
  await render();

  expect(state.updateVoiceState).toHaveBeenCalledWith({ voiceOnlyMode: true });
  expect(state.saveDevices).toHaveBeenCalledTimes(1);
  expect(state.saveDevices.mock.calls[0][0]).toEqual(expect.any(Function));
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');
  await expect
    .element(modeButton)
    .toHaveAttribute(
      'title',
      'Send and receive microphone audio only; cameras, screen sharing, and external media are disabled.'
    );
  expect(modeButton.element().className).toContain('text-success');
  const activeColor = getComputedStyle(
    page.getByRole('button', { name: 'Voice diagnostics' }).element()
  ).color;
  await vi.waitFor(() =>
    expect(getComputedStyle(modeButton.element()).color).toBe(activeColor)
  );
  await expect
    .element(page.getByRole('button', { name: 'Turn on camera' }))
    .toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Start screen share' }))
    .toBeDisabled();
  expect(state.toggleWebcam).not.toHaveBeenCalled();
  expect(state.toggleScreenShare).not.toHaveBeenCalled();
  await document.fonts.ready;
  await userEvent.unhover(page.elementLocator(document.body));
  await expect(page.elementLocator(document.documentElement)).toMatchScreenshot(
    'voice-control-dock-audio-only'
  );
});

test('eye activation follows native Enter and Space keyboard button behavior', async () => {
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.element().focus();
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));
  await render();
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');

  await modeButton.element().focus();
  await userEvent.keyboard('{Space}');
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(2));
  await render();
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'false');
  expect(state.updateVoiceState).toHaveBeenNthCalledWith(1, {
    voiceOnlyMode: true
  });
  expect(state.updateVoiceState).toHaveBeenNthCalledWith(2, {
    voiceOnlyMode: false
  });
  expect(state.toggleWebcam).not.toHaveBeenCalled();
  expect(state.toggleScreenShare).not.toHaveBeenCalled();
});

test('pending server update disables repeated toggles and delays local persistence', async () => {
  let resolveUpdate!: () => void;
  state.updateVoiceState.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
  );
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  await expect.element(modeButton).toBeDisabled();
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'false');
  (modeButton.element() as HTMLButtonElement).click();
  expect(state.updateVoiceState).toHaveBeenCalledTimes(1);
  expect(state.saveDevices).not.toHaveBeenCalled();
  resolveUpdate();
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));
  await render();
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');
});

test('voice-only persistence keeps device preferences changed while the server update is pending', async () => {
  let resolveUpdate!: () => void;
  state.updateVoiceState.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
  );
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  state.devices = {
    ...state.devices,
    microphoneId: 'mic-2',
    playbackId: 'speaker-2'
  };
  resolveUpdate();
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));

  expect(state.devices).toEqual({
    ...originalDevices,
    microphoneId: 'mic-2',
    playbackId: 'speaker-2',
    voiceOnlyMode: true
  });
});

test('voice-only mode is confirmed on the current voice session before local persistence', async () => {
  state.voiceServerModes = { 42: false, 43: false };
  let resolveFirstUpdate!: () => void;
  state.updateVoiceState.mockImplementationOnce((nextState) => {
    const requestChannelId = state.voiceChannelId!;
    return new Promise<void>((resolve) => {
      resolveFirstUpdate = () => {
        state.voiceServerModes[requestChannelId] = nextState.voiceOnlyMode;
        state.events.push(
          `server:${requestChannelId}:${nextState.voiceOnlyMode}`
        );
        resolve();
      };
    });
  });
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  setVoiceChannelId(43);
  await render();
  resolveFirstUpdate();
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));

  expect(state.updateVoiceState).toHaveBeenCalledTimes(2);
  expect(state.voiceServerModes[43]).toBe(true);
  expect(state.events).toEqual([
    'server:42:true',
    'server:43:true',
    'save:true'
  ]);
});

test('a stale session rejection retries the replacement session without showing an error', async () => {
  state.voiceServerModes = { 42: false, 43: false };
  let rejectFirstUpdate!: (error: Error) => void;
  state.updateVoiceState.mockImplementationOnce(
    () =>
      new Promise<void>((_, reject) => {
        rejectFirstUpdate = reject;
      })
  );
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  setVoiceChannelId(43);
  await render();
  rejectFirstUpdate(new Error('stale session'));
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));

  expect(state.updateVoiceState).toHaveBeenCalledTimes(2);
  expect(state.voiceServerModes[43]).toBe(true);
  expect(state.events).toEqual(['server:43:true', 'save:true']);
  expect(state.toastError).not.toHaveBeenCalled();
});

test('rejoining the same voice channel during an update is treated as a new session', async () => {
  state.voiceServerModes = { 42: false };
  let resolveFirstUpdate!: () => void;
  state.updateVoiceState.mockImplementationOnce((nextState) => {
    const requestChannelId = state.voiceChannelId!;
    return new Promise<void>((resolve) => {
      resolveFirstUpdate = () => {
        state.voiceServerModes[requestChannelId] = nextState.voiceOnlyMode;
        state.events.push(
          `server:${requestChannelId}:${nextState.voiceOnlyMode}`
        );
        resolve();
      };
    });
  });
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  setVoiceChannelId(undefined);
  setVoiceChannelId(42);
  state.voiceServerModes[42] = false;
  await render();
  resolveFirstUpdate();
  await vi.waitFor(() => expect(state.saveDevices).toHaveBeenCalledTimes(1));

  expect(state.updateVoiceState).toHaveBeenCalledTimes(2);
  expect(state.voiceServerModes[42]).toBe(true);
  expect(state.events).toEqual([
    'server:42:true',
    'server:42:true',
    'save:true'
  ]);
});

test('leaving voice before the server reply prevents an obsolete local mode save', async () => {
  let resolveUpdate!: () => void;
  state.updateVoiceState.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
  );
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  setVoiceChannelId(undefined);
  await render();
  resolveUpdate();
  await Promise.resolve();

  expect(state.saveDevices).not.toHaveBeenCalled();
  expect(state.devices.voiceOnlyMode).toBe(false);
});

test('a rejected update leaves local mode unchanged and reports the error', async () => {
  state.devices = { ...originalDevices, voiceOnlyMode: true };
  let rejectUpdate!: (error: Error) => void;
  state.updateVoiceState.mockImplementationOnce(
    () =>
      new Promise<void>((_, reject) => {
        rejectUpdate = reject;
      })
  );
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');

  await modeButton.click();
  await vi.waitFor(() =>
    expect(state.updateVoiceState).toHaveBeenCalledTimes(1)
  );
  state.devices = { ...state.devices, microphoneId: 'mic-2' };
  rejectUpdate(new Error('offline'));
  await vi.waitFor(() => expect(state.toastError).toHaveBeenCalledTimes(1));
  await render();

  expect(state.updateVoiceState).toHaveBeenCalledWith({ voiceOnlyMode: false });
  expect(state.devices).toEqual({
    ...originalDevices,
    microphoneId: 'mic-2',
    voiceOnlyMode: true
  });
  expect(state.saveDevices).not.toHaveBeenCalled();
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');
  await expect.element(modeButton).toBeEnabled();
});

test('Wi-Fi connection badge opens voice diagnostics directly by click and keyboard', async () => {
  await render();
  const diagnosticsButton = page.getByRole('button', {
    name: 'Voice diagnostics',
    exact: true
  });
  await diagnosticsButton.click();

  expect(state.openDialog).toHaveBeenCalledTimes(1);
  expect(state.openDialog).toHaveBeenCalledWith(Dialog.VOICE_DEBUG);
  state.openDialog.mockClear();

  await diagnosticsButton.element().focus();
  await userEvent.keyboard('{Enter}');
  expect(state.openDialog).toHaveBeenCalledTimes(1);
  expect(state.openDialog).toHaveBeenCalledWith(Dialog.VOICE_DEBUG);
});

test('voice-only controls preserve separate camera and screen-share permission gates', async () => {
  state.canUseWebcam = false;
  await render();

  await expect
    .element(page.getByRole('button', { name: 'Turn on camera' }))
    .toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Start screen share' }))
    .toBeEnabled();

  state.canUseWebcam = true;
  state.canShareScreen = false;
  await render(true);

  await expect
    .element(page.getByRole('button', { name: 'Turn on camera' }))
    .toBeEnabled();
  await expect
    .element(page.getByRole('button', { name: 'Start screen share' }))
    .toBeDisabled();
});

test('dock keeps its original footprint and removes the upper-row activity control', async () => {
  await render();

  const dock = host?.firstElementChild as HTMLDivElement;
  const [topRow, bottomRow] = Array.from(dock.children) as HTMLDivElement[];
  expect(dock.getBoundingClientRect().height).toBe(78);
  expect(topRow.getBoundingClientRect().height).toBe(46);
  expect(bottomRow.getBoundingClientRect().height).toBe(32);
  expect(topRow.children).toHaveLength(3);
  expect(dock.querySelector('.lucide-activity')).toBeNull();
  expect(dock.querySelectorAll('button')).toHaveLength(5);

  await document.fonts.ready;
  await userEvent.unhover(page.elementLocator(document.body));
  await expect(page.elementLocator(document.documentElement)).toMatchScreenshot(
    'voice-control-dock'
  );
});
