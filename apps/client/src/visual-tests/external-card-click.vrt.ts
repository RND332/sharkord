import { ExternalStreamCard } from '@/components/channel-view/voice/external-stream-card';
import { VolumeControlProvider } from '@/components/voice-provider/volume-control-context';
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../i18n';
import '../index.css';

vi.mock('@/features/server/voice/hooks', () => ({
  usePinnedCard: () => undefined,
  useShowUserBannersInVoice: () => false,
  useVoice: () => ({
    getStreamQuality: () => undefined,
    getStreamQualityLayers: () => undefined,
    isSimulcastConsumer: () => false
  })
}));
vi.mock('@/components/channel-view/voice/hooks/use-voice-refs', () => ({
  useVoiceRefs: () => ({
    externalVideoRef: { current: null },
    hasExternalVideoStream: false,
    hasExternalAudioStream: false
  })
}));

test('the external stream caption is part of the left click pin target', async () => {
  const host = document.createElement('div');
  host.style.cssText = 'width:640px;height:360px';
  document.body.append(host);
  const root = createRoot(host);
  const Harness = () => {
    const [pinned, setPinned] = useState(false);
    return createElement(VolumeControlProvider, {
      children: createElement(ExternalStreamCard, {
        streamId: 8,
        stream: {
          title: 'Community radio',
          key: 'radio',
          pluginId: 'fixture',
          tracks: {}
        },
        cardId: 'external-8',
        isPinned: pinned,
        showPinControls: true,
        onPin: () => setPinned(true),
        onUnpin: () => setPinned(false)
      })
    });
  };
  try {
    root.render(createElement(Harness));
    await page
      .getByRole('button', { name: 'Pin Community radio', exact: true })
      .hover();
    const caption = page
      .getByText('Community radio', { exact: false })
      .element();
    const rect = caption.getBoundingClientRect();
    const target = document.elementFromPoint(
      rect.left + 4,
      rect.top + 4
    ) as HTMLElement;
    target.click();
    await expect
      .element(
        page.getByRole('button', { name: 'Unpin Community radio', exact: true })
      )
      .toHaveAttribute('aria-pressed', 'true');
  } finally {
    root.unmount();
    host.remove();
  }
});
