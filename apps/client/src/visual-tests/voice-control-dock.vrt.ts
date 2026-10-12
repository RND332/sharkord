import { Dialog } from '@/components/dialogs/dialogs';
import { VoiceControl } from '@/components/left-sidebar/voice-control';
import '@fontsource-variable/inter';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../index.css';

const state = vi.hoisted(() => ({
  devices: {
    microphoneId: 'mic-1',
    playbackId: 'speaker-1',
    webcamId: 'camera-1',
    voiceOnlyMode: false
  },
  saveDevices: vi.fn(
    (_devices: {
      microphoneId: string;
      playbackId: string;
      webcamId: string;
      voiceOnlyMode: boolean;
    }) => {}
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
  useCurrentVoiceChannelId: () => 42
}));
vi.mock('@/features/server/hooks', () => ({
  useChannelCan: () => () => true,
  useServerName: () => 'Test server'
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
const originalDevices = {
  microphoneId: 'mic-1',
  playbackId: 'speaker-1',
  webcamId: 'camera-1',
  voiceOnlyMode: false
};

const render = async () => {
  document.documentElement.classList.add('dark');
  if (!root) {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:252px;height:78px';
    document.body.append(host);
    root = createRoot(host);
  }
  root.render(createElement(VoiceControl));
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
  state.saveDevices.mockReset();
  state.saveDevices.mockImplementation((devices) => {
    state.devices = devices;
  });
  state.updateVoiceState.mockReset();
  state.updateVoiceState.mockResolvedValue(undefined);
  state.openDialog.mockReset();
  state.toastError.mockReset();
  state.toggleWebcam.mockReset();
  state.toggleScreenShare.mockReset();
});

state.saveDevices.mockImplementation((devices) => {
  state.devices = devices;
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
  expect(state.saveDevices).toHaveBeenCalledWith({
    ...originalDevices,
    voiceOnlyMode: true
  });
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
  await expect(page.elementLocator(host!)).toMatchScreenshot(
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

test('a rejected update leaves local mode unchanged and reports the error', async () => {
  state.devices = { ...originalDevices, voiceOnlyMode: true };
  state.updateVoiceState.mockRejectedValueOnce(new Error('offline'));
  await render();
  const modeButton = page.getByRole('button', {
    name: 'Voice-only mode',
    exact: true
  });
  await expect.element(modeButton).toHaveAttribute('aria-pressed', 'true');

  await modeButton.click();
  await vi.waitFor(() => expect(state.toastError).toHaveBeenCalledTimes(1));
  await render();

  expect(state.updateVoiceState).toHaveBeenCalledWith({ voiceOnlyMode: false });
  expect(state.devices.voiceOnlyMode).toBe(true);
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
  await expect(page.elementLocator(host!)).toMatchScreenshot(
    'voice-control-dock'
  );
});
