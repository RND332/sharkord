import { StatsPopover } from '@/components/left-sidebar/stats-popover';
import { ThemeProvider } from '@/components/theme-provider';
import type { TransportStatsData } from '@/components/voice-provider/hooks/use-transport-stats';
import { VoiceStatsContext } from '@/components/voice-provider/stats-context';
import { i18n } from '@/i18n';
import { TestId } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: { noiseSuppression: 'rnnoise' } })
}));
vi.mock('@/features/server/hooks', () => ({
  useCurrentVoicePeers: () => [
    { id: 2, name: 'aria' },
    { id: 3, name: 'jules' }
  ]
}));

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

for (const available of [true, false]) {
  test(`connection table preserves ${available ? 'measured' : 'unavailable'} peer RTT separately from server control`, async () => {
    localStorage.setItem('vite-ui-theme', 'hatsune-miku');
    await i18n.changeLanguage('en');
    await document.fonts.ready;
    const stats: TransportStatsData = {
      peerRtts: available ? { 2: 2, 3: 10 } : { 2: null },
      serverRtt: 80,
      direct: null,
      producer: {
        bytesSent: 1000,
        bytesReceived: 0,
        packetsSent: 210880,
        packetsReceived: 0,
        packetsLost: 0,
        rtt: 650,
        jitter: 0,
        timestamp: Date.now()
      },
      consumer: {
        bytesSent: 0,
        bytesReceived: 2000,
        packetsSent: 0,
        packetsReceived: 207810,
        packetsLost: 83,
        rtt: 650,
        jitter: 0,
        timestamp: Date.now()
      },
      screenShare: null,
      totalBytesSent: 12450000,
      totalBytesReceived: 22320000,
      currentBitrateSent: 6260,
      currentBitrateReceived: 16050
    };
    host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:80px;bottom:96px;width:252px;height:96px';
    host.dataset.testid = TestId.LEFT_SIDEBAR;
    host.setAttribute('data-voice-dock', '');
    document.body.append(host);
    root = createRoot(host);
    root.render(
      createElement(
        ThemeProvider,
        null,
        createElement(VoiceStatsContext.Provider, {
          value: { stats, subscribe: () => () => {} },
          children: createElement(StatsPopover, {
            children: createElement('button', { type: 'button' }, 'Stats')
          })
        })
      )
    );
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await expect
      .element(
        page.getByRole('columnheader', { name: 'Connection', exact: true })
      )
      .toBeVisible();
    await expect
      .element(page.getByRole('columnheader', { name: 'Ping', exact: true }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole('row', {
          name: available ? 'aria 2 ms' : 'aria —',
          exact: true
        })
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole('row', {
          name: available ? 'jules 10 ms' : 'jules —',
          exact: true
        })
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole('row', { name: 'Server (control) 80 ms', exact: true })
      )
      .toBeVisible();
    const content = document.querySelector<HTMLElement>(
      '[data-slot="popover-content"]'
    )!;
    await expect
      .poll(() => content.getBoundingClientRect().width)
      .toBeCloseTo(236, 1);
    const box = content.getBoundingClientRect();
    const dock = host.getBoundingClientRect();
    expect(box.left).toBeCloseTo(dock.left + 8, 1);
    expect(box.right).toBeCloseTo(dock.right - 8, 1);
    expect(dock.top - box.bottom).toBeCloseTo(12, 1);
    expect(box.height).toBeCloseTo(376, 1);
    expect(getComputedStyle(content).backgroundColor).toBe('rgb(21, 28, 34)');
    expect(
      getComputedStyle(page.getByText('83', { exact: true }).element()).color
    ).not.toBe(
      getComputedStyle(page.getByText('210.88K', { exact: true }).element())
        .color
    );
    for (const node of [content, ...content.querySelectorAll('*')]) {
      const style = getComputedStyle(node);
      expect(
        new Set([
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth
        ]).size
      ).toBe(1);
    }
    expect(content.textContent).toContain('Microphone');
    expect(content.textContent).toContain('RNNoise');
    expect(content.textContent).toContain('Session Totals');
    expect(content.textContent).not.toContain('650');
    expect(content.textContent).not.toMatch(/Voice P2P|Camera P2P|Latency/);
    await expect
      .element(page.elementLocator(content))
      .toMatchScreenshot(
        `connection-${available ? 'measured' : 'unavailable'}`
      );
  });
}
