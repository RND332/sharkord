import { ControlsBar } from '@/components/channel-view/voice/controls-bar';
import { UserControl } from '@/components/left-sidebar/user-control';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../index.css';

const { toggleMic, toggleSound, saveDevices, openServerScreen } = vi.hoisted(
  () => ({
    toggleMic: vi.fn(),
    toggleSound: vi.fn(),
    saveDevices: vi.fn(),
    openServerScreen: vi.fn()
  })
);
vi.mock('@/features/server-screens/actions', () => ({ openServerScreen }));
vi.mock('@/features/server/channels/hooks', () => ({
  useCurrentVoiceChannelId: () => 1,
  useIsCurrentVoiceChannelSelected: () => true
}));
vi.mock('@/features/server/hooks', () => ({
  useChannelCan: () => () => true,
  useCurrentVoicePeers: () => []
}));
vi.mock('@/features/server/users/hooks', () => ({
  useOwnPublicUser: () => ({ id: 1, name: 'Test', status: 'online' })
}));
vi.mock('@/features/server/voice/hooks', () => ({
  useOwnVoiceState: () => ({ micMuted: false, soundMuted: false }),
  useAlwaysShowVoiceControls: () => true,
  useVoice: () => ({
    ownVoiceState: { micMuted: false, soundMuted: false },
    toggleMic,
    toggleSound
  })
}));
vi.mock('@/components/protect', () => ({
  Protect: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock('@/components/channel-view/voice/reactions-button', () => ({
  ReactionsButton: () => null
}));
vi.mock('@/features/server/voice/actions', () => ({ leaveVoice: vi.fn() }));
vi.mock('@/components/user-avatar', () => ({ UserAvatar: () => null }));
vi.mock('@/components/user-popover', () => ({
  UserPopover: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));
vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({
    devices: {
      microphoneId: 'mic',
      playbackId: 'out',
      microphoneVolume: 75,
      playbackVolume: 60
    },
    inputDevices: [
      { deviceId: 'mic', label: 'Studio microphone' },
      { deviceId: 'usb', label: 'USB microphone' }
    ],
    playbackDevices: [{ deviceId: 'out', label: 'Headphones' }],
    saveDevices
  })
}));

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  root?.unmount();
  host?.remove();
  vi.clearAllMocks();
});

test('separate audio arrows expose current devices, keyboard volume, and direct Devices navigation', async () => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(createElement(UserControl));
  await page
    .getByRole('button', { name: 'microphoneSettings', exact: true })
    .click();
  expect(toggleMic).not.toHaveBeenCalled();
  await expect
    .element(page.getByRole('combobox'))
    .toHaveTextContent('inputDeviceStudio microphone');
  const panel = page.getByRole('dialog').element();
  expect(panel.getBoundingClientRect().width).toBe(296);
  expect(getComputedStyle(panel).padding).toBe('8px');
  expect(getComputedStyle(panel).borderRadius).toBe('12px');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'USB microphone' }).click();
  const selectDevice = saveDevices.mock.lastCall![0];
  expect(selectDevice({ microphoneId: 'mic', playbackId: 'out' })).toEqual({
    microphoneId: 'usb',
    playbackId: 'out'
  });
  const slider = page.getByRole('slider');
  await expect.element(slider).toHaveAccessibleName('microphoneVolume');
  await expect.element(slider).toHaveAttribute('aria-valuenow', '75');
  await slider.click();
  await userEvent.keyboard('{Home}');
  expect(saveDevices).toHaveBeenCalled();
  const update = saveDevices.mock.lastCall![0];
  expect(update({ microphoneVolume: 75, playbackVolume: 60 })).toEqual({
    microphoneVolume: 0,
    playbackVolume: 60
  });
  await page
    .getByRole('button', { name: 'voiceSettings', exact: true })
    .click();
  expect(openServerScreen).toHaveBeenCalledWith(expect.anything(), {
    initialEntryId: 'devices'
  });
  await page
    .getByRole('button', { name: 'outputSettings', exact: true })
    .click();
  expect(toggleSound).not.toHaveBeenCalled();
  await expect
    .element(page.getByRole('combobox'))
    .toHaveTextContent('outputDeviceHeadphones');
  await expect
    .element(page.getByRole('slider'))
    .toHaveAttribute('aria-valuenow', '60');
  await page.getByRole('slider').click();
  await userEvent.keyboard('{End}');
  const outputUpdate = saveDevices.mock.lastCall![0];
  expect(outputUpdate({ microphoneVolume: 75, playbackVolume: 60 })).toEqual({
    microphoneVolume: 75,
    playbackVolume: 100
  });
  await userEvent.keyboard('{Escape}');
  await expect
    .element(page.getByRole('button', { name: 'outputSettings', exact: true }))
    .toHaveFocus();
  await page.getByRole('button', { name: 'muteMic', exact: true }).click();
  expect(toggleMic).toHaveBeenCalledTimes(1);
  await page.getByRole('button', { name: 'deafen', exact: true }).click();
  expect(toggleSound).toHaveBeenCalledTimes(1);
});

test('main toolbar keeps mute and deafen independent from adjacent settings arrows', async () => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(createElement(ControlsBar, { channelId: 1 }));
  await page
    .getByRole('button', { name: 'microphoneSettings', exact: true })
    .click();
  expect(toggleMic).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  await page.getByRole('button', { name: 'Mute', exact: true }).click();
  expect(toggleMic).toHaveBeenCalledTimes(1);
  await page
    .getByRole('button', { name: 'outputSettings', exact: true })
    .click();
  expect(toggleSound).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  await page.getByRole('button', { name: 'Deafen', exact: true }).click();
  expect(toggleSound).toHaveBeenCalledTimes(1);
});
