import { PinnedCardType } from '@/components/channel-view/voice/hooks/use-pin-card-controller';
import { Dialog } from '@/components/dialogs/dialogs';
import { ServerScreen } from '@/components/server-screens/screens';
import {
  closeThreadSidebar,
  closeVoiceChatSidebar,
  openThreadSidebar,
  openVoiceChatSidebar
} from '@/features/app/actions';
import { openDialog, resetDialogs } from '@/features/dialogs/actions';
import {
  closeServerScreens,
  openServerScreen
} from '@/features/server-screens/actions';
import { setDmsOpen } from '@/features/server/actions';
import {
  setCurrentVoiceChannelId,
  setSelectedChannelId
} from '@/features/server/channels/actions';
import {
  addUserToVoiceChannel,
  joinVoice,
  leaveVoice,
  removeUserFromVoiceChannel,
  setAlwaysShowVoiceControls,
  setPinnedCard,
  updateOwnVoiceState
} from '@/features/server/voice/actions';
import { clearVoiceDebugEvents } from '@/helpers/voice-debug';
import * as trpc from '@/lib/trpc';
import { MARKETPLACE_REGISTRY_URL, TestId } from '@sharkord/shared';
import { toast } from 'sonner';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi
} from 'vitest';

import { page } from 'vitest/browser';
vi.mock('@/lib/trpc', { spy: true });

const addRoot = (id: string) => {
  const element = document.createElement('div');
  element.id = id;
  document.body.append(element);
};

const snapshot = (name: string) =>
  expect(page).toMatchScreenshot(name, { timeout: 3_000 });

const waitForRender = () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  return promise;
};

const createScreenShareStream = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable');

  context.fillStyle = '#12151a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#222731';
  context.fillRect(0, 0, canvas.width, 54);
  context.fillStyle = '#e4a054';
  context.fillRect(24, 20, 14, 14);
  context.font = '24px monospace';
  context.fillStyle = '#b2b8c1';
  context.fillText('screen-share.ts', 58, 34);

  const lines = [
    ['#76c49b', 'export function startScreenShare() {'],
    ['#b2b8c1', '  const stream = await navigator.mediaDevices'],
    ['#e4a054', '    .getDisplayMedia({ video: true });'],
    ['#b2b8c1', '  return connectDirectly(stream);'],
    ['#76c49b', '}']
  ] as const;

  context.font = '28px monospace';
  lines.forEach(([color, text], index) => {
    context.fillStyle = color;
    context.fillText(text, 72, 150 + index * 54);
  });

  return canvas.captureStream(1);
};

const addVoiceParticipants = (sharingUserId?: number) => {
  for (const userId of [3, 2, 1, 4]) {
    addUserToVoiceChannel(userId, 2, {
      micMuted: false,
      soundMuted: false,
      webcamEnabled: false,
      sharingScreen: userId === sharingUserId
    });
  }
};

const removeVoiceParticipants = () => {
  for (const userId of [1, 2, 3, 4]) {
    removeUserFromVoiceChannel(userId, 2);
  }
};
const marketplaceEntries = [
  {
    plugin: {
      id: 'soundboard',
      name: 'Soundboard',
      description: 'Share polished sound effects in voice channels.',
      author: 'Sharkord',
      logo: 'https://localhost:1/soundboard.png',
      homepage: 'https://github.com/Sharkord/plugins',
      tags: ['voice'],
      categories: ['Fun'],
      verified: true,
      screenshots: []
    },
    versions: [
      {
        version: '1.2.0',
        downloadUrl:
          'https://github.com/Sharkord/plugins/releases/download/soundboard-1.2.0/plugin.tar.gz',
        checksum: 'visual-test-soundboard',
        sdkVersion: 1,
        size: 1_372_160,
        timestamp: Date.UTC(2026, 8, 28)
      }
    ]
  },
  {
    plugin: {
      id: 'moderation-toolkit',
      name: 'Moderation Toolkit',
      description: 'Practical moderation workflows and audit helpers.',
      author: 'Sharkord',
      logo: 'https://localhost:1/moderation.png',
      homepage: 'https://github.com/Sharkord/plugins',
      tags: ['moderation'],
      categories: ['Administration'],
      verified: true,
      screenshots: []
    },
    versions: [
      {
        version: '1.0.4',
        downloadUrl:
          'https://github.com/Sharkord/plugins/releases/download/moderation-1.0.4/plugin.tar.gz',
        checksum: 'visual-test-moderation',
        sdkVersion: 1,
        size: 983_040,
        timestamp: Date.UTC(2026, 8, 21)
      }
    ]
  }
];

const nativeFetch = window.fetch.bind(window);
const visualFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url === MARKETPLACE_REGISTRY_URL) {
    return Promise.resolve(Response.json(marketplaceEntries));
  }

  return nativeFetch(input, init);
};

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T10:00:00Z'));
  vi.stubGlobal('fetch', visualFetch);
  localStorage.clear();
  document.body.replaceChildren();
  addRoot('root');
  addRoot('portal');
  addRoot('imagePortal');

  const [{ createElement }, { createRoot }, { ClientApp }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('../main')
  ]);
  createRoot(document.getElementById('root')!).render(createElement(ClientApp));
  await document.fonts.ready;
  await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('rnd332');
  await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.CONNECT_BUTTON).click();
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'general' })
    .click();
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  resetDialogs();
  closeThreadSidebar();
  setDmsOpen(false);
  setSelectedChannelId(1);
  await waitForRender();

  document
    .querySelector<HTMLButtonElement>(
      'button[aria-label="Close Members Sidebar"]'
    )
    ?.click();
});

afterEach(() => {
  closeServerScreens();
});

test('short text history uses Paper gutters and rests above the composer', async () => {
  await expect
    .element(page.getByTestId(TestId.MESSAGE_ITEM).first())
    .toBeVisible();
  const container = document.querySelector<HTMLElement>(
    '[data-messages-container]'
  )!;
  const styles = getComputedStyle(container);
  // Paper 2H-0: 28px top/inline, 8px bottom; short histories align to end.
  expect(styles.paddingLeft).toBe('28px');
  expect(styles.paddingRight).toBe('28px');
  expect(styles.paddingTop).toBe('28px');
  expect(styles.paddingBottom).toBe('8px');
  const history = container.firstElementChild!;
  const lastGroup = history.lastElementChild!;
  expect(lastGroup.getBoundingClientRect().bottom).toBeCloseTo(
    container.getBoundingClientRect().bottom - 8,
    0
  );
});

test('overflowing text history keeps its first message reachable', async () => {
  await expect
    .element(page.getByTestId(TestId.MESSAGE_ITEM).first())
    .toBeVisible();
  const container = document.querySelector<HTMLElement>(
    '[data-messages-container]'
  )!;
  const originalStyle = container.style.cssText;
  try {
    // Restrict the viewport around the existing seeded history, not invented data.
    container.style.flex = 'none';
    container.style.maxHeight = '160px';
    container.style.minHeight = '0';
    await waitForRender();
    container.scrollTop = 0;
    const history = container.firstElementChild!;
    expect(container.scrollHeight).toBeGreaterThan(container.clientHeight);
    expect(history.firstElementChild!.getBoundingClientRect().top).toBeCloseTo(
      container.getBoundingClientRect().top + 28,
      0
    );
    container.scrollTop = container.scrollHeight;
    await waitForRender();
    expect(
      history.lastElementChild!.getBoundingClientRect().bottom
    ).toBeCloseTo(container.getBoundingClientRect().bottom - 8, 0);
  } finally {
    container.style.cssText = originalStyle;
    await waitForRender();
  }
});

test('message author typography and timestamps use the Paper hierarchy', async () => {
  const author = page.getByText('aria', { exact: true });
  await expect.element(author).toBeVisible();
  const authorStyle = getComputedStyle(author.element());
  expect(authorStyle.fontSize).toBe('14px');
  expect(authorStyle.lineHeight).toBe('20px');
  expect(authorStyle.fontWeight).toBe('600');
  const timestamp = author.element().nextElementSibling!;
  expect(getComputedStyle(timestamp).color).toBe('rgb(143, 148, 158)');
});

test('message groups use Paper avatar and body spacing', async () => {
  const author = page.getByText('aria', { exact: true });
  await expect.element(author).toBeVisible();
  const header = author.element().parentElement!;
  const body = header.parentElement!;
  const group = body.parentElement!;
  expect(getComputedStyle(group).columnGap).toBe('12px');
  expect(getComputedStyle(group).paddingTop).toBe('12px');
  expect(getComputedStyle(group).paddingLeft).toBe('0px');
  expect(group.firstElementChild!.getBoundingClientRect().width).toBe(38);
  expect(getComputedStyle(body).rowGap).toBe('4px');
  expect(getComputedStyle(header).columnGap).toBe('9px');
  expect(
    page
      .getByTestId(TestId.MESSAGE_ITEM)
      .first()
      .element()
      .getBoundingClientRect().left
  ).toBe(header.getBoundingClientRect().left);
});

test('complete channel history shows a Paper welcome and date context for clock timestamps', async () => {
  await expect
    .element(page.getByTestId(TestId.MESSAGE_ITEM).first())
    .toBeVisible();
  await expect
    .element(page.getByText('Welcome to #general', { exact: true }))
    .toBeVisible();
  const welcome = page
    .getByText('Welcome to #general', { exact: true })
    .element();
  expect(getComputedStyle(welcome).fontSize).toBe('27px');
  expect(getComputedStyle(welcome).lineHeight).toBe('33px');
  const separator = document.querySelector('[data-message-date]')!;
  expect(separator.textContent).toBe('Today');
  expect(getComputedStyle(separator.querySelector('span')!).textTransform).toBe(
    'uppercase'
  );
  expect(separator.getBoundingClientRect().height).toBe(36);
  const timestamp = page
    .getByText('aria', { exact: true })
    .element().nextElementSibling!;
  expect(timestamp.textContent).toBe('9:40 AM');
  expect(timestamp.getAttribute('title')).toContain('2026');
  expect(timestamp.getAttribute('datetime')).toBe('2026-10-09T09:40:00.000Z');
});

test('empty composer uses Paper geometry and keeps upload on the left', async () => {
  const composer = document.querySelector<HTMLElement>('.compose-container')!;
  const row = composer.querySelector<HTMLElement>('.compose-scroll-row')!;
  expect(composer.getBoundingClientRect().height).toBe(112);
  expect(getComputedStyle(composer).paddingTop).toBe('10px');
  expect(row.getBoundingClientRect().height).toBe(54);
  expect(getComputedStyle(row).backgroundColor).toBe('rgb(57, 62, 71)');
  expect(getComputedStyle(row).borderTopWidth).toBe('0px');
  expect(getComputedStyle(row).borderRadius).toBe('10px');
  const upload = page.getByRole('button', { name: 'Attach files' }).element();
  expect(upload.getBoundingClientRect().left).toBeLessThan(
    row.querySelector('.ProseMirror')!.getBoundingClientRect().left
  );
  await expect
    .element(
      page.getByText('Press Enter to send · Shift + Enter for a new line')
    )
    .toBeVisible();
  expect(page.getByRole('button', { name: 'Send message' }).query()).toBeNull();
  const input = page.elementLocator(
    row.querySelector<HTMLElement>('.ProseMirror')!
  );
  await input.fill('A draft keeps an explicit send action.');
  await expect
    .element(page.getByRole('button', { name: 'Send message' }))
    .toBeVisible();
  await input.fill('');
  await page.getByText('sharkord', { exact: true }).hover();
});

test('global search stays centered across desktop widths', async () => {
  try {
    for (const width of [1024, 1440, 2560]) {
      await page.viewport(width, 900);
      await waitForRender();
      const search = page
        .getByRole('button', {
          name: /Search messages, channels, and people Ctrl K/
        })
        .element();
      const rect = search.getBoundingClientRect();
      expect(
        Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)
      ).toBeLessThanOrEqual(1);
      expect(rect.width).toBeLessThanOrEqual(550);
      const header = search.closest('header')!;
      const logo = header.querySelector('img')!.getBoundingClientRect();
      const actions = header.lastElementChild!.getBoundingClientRect();
      expect(rect.left).toBeGreaterThan(logo.right);
      expect(rect.right).toBeLessThanOrEqual(actions.left);
    }
  } finally {
    await page.viewport(1440, 900);
    await waitForRender();
  }
});

test('application rail omits the redundant user avatar', async () => {
  const rail = page.getByRole('navigation', { name: 'Application' }).element();
  expect(rail.querySelector('[data-slot="avatar"]')).toBeNull();
  expect(
    page
      .getByTestId(TestId.LEFT_SIDEBAR)
      .element()
      .querySelector('[data-slot="avatar"]')
  ).not.toBeNull();
});

test('application rail omits the decorative orange S but keeps navigation', async () => {
  const rail = page.getByRole('navigation', { name: 'Application' }).element();
  expect(
    Array.from(rail.children).some(
      (node) =>
        node.getAttribute('aria-hidden') === 'true' &&
        node.textContent?.trim() === 'S'
    )
  ).toBe(false);
  const server = rail.querySelector<HTMLButtonElement>(
    'button[aria-label="Rnd Community"]'
  )!;
  expect(server).not.toBeNull();
  expect(
    rail.querySelector(`[data-testid="${TestId.DM_TOGGLE}"]`)
  ).not.toBeNull();
  expect(
    rail.querySelector(`[data-testid="${TestId.USER_SETTINGS_TRIGGER}"]`)
  ).not.toBeNull();
  await page.elementLocator(server).click();
  await waitForRender();
  expect(server.getAttribute('aria-current')).toBe('page');
});

test('right docks open and close without layout animation', async () => {
  const assertInstantDock = async (panel: HTMLElement) => {
    await waitForRender();
    const openedWidth = panel.getBoundingClientRect().width;
    expect(openedWidth).toBeGreaterThan(0);
    expect(getComputedStyle(panel).transitionDuration).toBe('0s');
    expect(getComputedStyle(panel).animationDuration).toBe('0s');
    expect(panel.getAnimations()).toHaveLength(0);
    const handle = panel.querySelector<HTMLElement>('.cursor-col-resize')!;
    const right = panel.getBoundingClientRect().right;
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0 })
    );
    await waitForRender();
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: right - openedWidth - 20 })
    );
    await waitForRender();
    expect(panel.getBoundingClientRect().width).toBe(openedWidth + 20);
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: right - openedWidth })
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    await waitForRender();
    expect(panel.getBoundingClientRect().width).toBe(openedWidth);
  };
  await page.getByRole('button', { name: 'Open Members Sidebar' }).click();
  const members = page
    .getByTestId(TestId.MEMBER_ITEM)
    .first()
    .element()
    .closest<HTMLElement>('.border-l')!;
  await assertInstantDock(members);
  await page.getByRole('button', { name: 'Close Members Sidebar' }).click();
  await waitForRender();
  expect(members.getBoundingClientRect().width).toBe(0);
  expect(members.getAnimations()).toHaveLength(0);

  const firstMessage = page.getByTestId(TestId.MESSAGE_ITEM).first();
  openThreadSidebar(Number(firstMessage.element().dataset.messageId), 1);
  await expect.element(page.getByText('Thread', { exact: true })).toBeVisible();
  const thread = page
    .getByText('Thread', { exact: true })
    .element()
    .closest<HTMLElement>('.border-l')!;
  await assertInstantDock(thread);
  closeThreadSidebar();
  await waitForRender();
  expect(thread.getBoundingClientRect().width).toBe(0);
  expect(thread.getAnimations()).toHaveLength(0);

  openVoiceChatSidebar(2);
  await waitForRender();
  const chat = Array.from(
    document.querySelectorAll<HTMLElement>('.border-l[style]')
  ).find((panel) => panel.getBoundingClientRect().width > 0)!;
  try {
    await assertInstantDock(chat);
    closeVoiceChatSidebar();
    await waitForRender();
    expect(chat.getBoundingClientRect().width).toBe(0);
    expect(chat.getAnimations()).toHaveLength(0);
  } finally {
    closeVoiceChatSidebar();
  }
});

test('text channel matches the Paper design', async () => {
  await expect.element(page.getByTestId(TestId.SERVER_VIEW)).toBeVisible();
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'general' })
    .click();

  await snapshot('text-channel');
});

test('thread sidebar matches the Paper design', async () => {
  const firstMessage = page.getByTestId(TestId.MESSAGE_ITEM).first();
  await expect.element(firstMessage).toBeVisible();
  const messageId = Number(firstMessage.element().dataset.messageId);
  openThreadSidebar(messageId, 1);
  await expect.element(page.getByText('Thread', { exact: true })).toBeVisible();

  await snapshot('thread-sidebar');
  closeThreadSidebar();
});

test('members sidebar matches the Paper design', async () => {
  await page.getByRole('button', { name: 'Open Members Sidebar' }).click();
  await expect
    .element(page.getByTestId(TestId.MEMBER_ITEM).first())
    .toBeVisible();

  await snapshot('members-sidebar');
});

test('direct messages match the Paper design', async () => {
  await page.getByTestId(TestId.DM_TOGGLE).click();
  await page.getByTestId(TestId.DM_ITEM).filter({ hasText: 'aria' }).click();
  await expect
    .element(page.getByText('Direct Message', { exact: true }))
    .toBeVisible();

  await snapshot('direct-messages');
  expect(document.querySelector('[data-channel-welcome]')).toBeNull();
});

test('voice channel matches the Paper design', async () => {
  setSelectedChannelId(2);
  setAlwaysShowVoiceControls(true);
  await joinVoice(2);

  addVoiceParticipants();

  await expect
    .element(page.getByRole('button', { name: 'Mute' }))
    .toBeVisible();

  try {
    await snapshot('voice-channel');
  } finally {
    await leaveVoice({ reason: 'user_disconnect_button' });
    setSelectedChannelId(1);

    removeVoiceParticipants();
  }
});

test('remote screen share stays in the real voice grid before watching', async () => {
  setSelectedChannelId(2);
  addVoiceParticipants(2);
  await waitForRender();
  try {
    await expect
      .element(page.getByRole('button', { name: 'Watch stream', exact: true }))
      .toBeVisible();
    const tile = document.querySelector<HTMLElement>(
      '[data-screen-share-card]'
    )!;
    expect(tile.querySelector('video')).toBeNull();
    expect(tile.querySelector('[data-slot="avatar"]')).toBeNull();
    expect(tile.textContent).not.toContain('LIVE');
    expect(tile.textContent).toContain("aria's screen");
    const participant = document.querySelector<HTMLElement>(
      '.group\\/voice-user-card'
    )!;
    expect(tile.getBoundingClientRect().width).toBe(
      participant.getBoundingClientRect().width
    );
    expect(tile.getBoundingClientRect().height).toBe(
      participant.getBoundingClientRect().height
    );
    expect(
      tile.getBoundingClientRect().width / tile.getBoundingClientRect().height
    ).toBeCloseTo(16 / 9, 2);
    try {
      for (const [width, height] of [
        [1024, 600],
        [2560, 1440]
      ]) {
        await page.viewport(width, height);
        await waitForRender();
        const rect = tile.getBoundingClientRect();
        const button = tile.querySelector('button')!.getBoundingClientRect();
        expect(rect.width / rect.height).toBeCloseTo(16 / 9, 2);
        expect(button.left).toBeGreaterThanOrEqual(rect.left);
        expect(button.right).toBeLessThanOrEqual(rect.right);
        expect(rect.bottom).toBeLessThanOrEqual(height);
      }
    } finally {
      await page.viewport(1440, 900);
      await waitForRender();
    }
    await page.getByText('sharkord', { exact: true }).hover();
    await snapshot('screen-sharing-not-watching');
  } finally {
    removeVoiceParticipants();
    setSelectedChannelId(1);
  }
});

test('screen sharing states match the Paper design', async () => {
  const stream = createScreenShareStream();
  const mediaDevices = navigator.mediaDevices;
  const originalGetDisplayMedia = Object.getOwnPropertyDescriptor(
    mediaDevices,
    'getDisplayMedia'
  );
  Object.defineProperty(mediaDevices, 'getDisplayMedia', {
    configurable: true,
    value: vi.fn().mockResolvedValue(stream)
  });

  const { promise: releaseStateUpdate, resolve: resolveStateUpdate } =
    Promise.withResolvers<void>();
  const stateUpdates: Promise<void>[] = [];
  const getClientSpy = vi.mocked(trpc.getTRPCClient).mockReturnValue({
    voice: {
      updateState: {
        mutate: () => {
          stateUpdates.push(releaseStateUpdate);
          return releaseStateUpdate;
        }
      }
    }
  } as unknown as ReturnType<typeof trpc.getTRPCClient>);

  setSelectedChannelId(2);
  setCurrentVoiceChannelId(2);
  setAlwaysShowVoiceControls(true);
  updateOwnVoiceState({ sharingScreen: false });
  addVoiceParticipants(1);
  await waitForRender();
  await expect
    .element(page.getByRole('button', { name: 'Mute' }))
    .toBeVisible();

  try {
    await page.getByRole('button', { name: 'Share Screen' }).click();

    for (let attempt = 0; attempt < 10; attempt++) {
      if (document.querySelector('video')) break;
      await waitForRender();
    }
    expect(document.querySelector('video')).not.toBeNull();

    await snapshot('screen-sharing-grid');

    setPinnedCard({
      id: 'screen-share-1',
      type: PinnedCardType.SCREEN_SHARE,
      userId: 1
    });
    await waitForRender();
    await snapshot('screen-sharing-focus');
  } finally {
    document
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Stop Screen Share"]'
      )
      ?.click();
    resolveStateUpdate();
    await Promise.all(stateUpdates);
    await waitForRender();

    for (let attempt = 0; attempt < 10; attempt++) {
      await waitForRender();
      if (!document.querySelector('video')) break;
    }

    setPinnedCard(undefined);
    updateOwnVoiceState({ sharingScreen: false });
    setCurrentVoiceChannelId(undefined);
    setSelectedChannelId(1);
    removeVoiceParticipants();
    stream.getTracks().forEach((track) => track.stop());
    getClientSpy.mockRestore();

    if (originalGetDisplayMedia) {
      Object.defineProperty(
        mediaDevices,
        'getDisplayMedia',
        originalGetDisplayMedia
      );
    } else {
      Reflect.deleteProperty(mediaDevices, 'getDisplayMedia');
    }
    toast.dismiss();
    clearVoiceDebugEvents();
    for (let attempt = 0; attempt < 20; attempt++) {
      await waitForRender();
      if (!document.querySelector('[data-sonner-toast]')) break;
    }
  }
});

test('user settings match the Paper design', async () => {
  openServerScreen(ServerScreen.USER_SETTINGS);
  await expect
    .element(page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).first())
    .toBeVisible();

  await snapshot('user-settings');
});

test('server settings match the Paper design', async () => {
  openServerScreen(ServerScreen.SERVER_SETTINGS);
  await expect
    .element(page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).first())
    .toBeVisible();

  await snapshot('server-settings');
});

test('channel settings match the Paper design', async () => {
  openServerScreen(ServerScreen.CHANNEL_SETTINGS, { channelId: 1 });
  await expect
    .element(page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).first())
    .toBeVisible();

  await snapshot('channel-settings');
});

test('category settings match the Paper design', async () => {
  openServerScreen(ServerScreen.CATEGORY_SETTINGS, { categoryId: 1 });
  await expect
    .element(page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).first())
    .toBeVisible();

  await snapshot('category-settings');
});

test('plugin marketplace matches the Paper design', async () => {
  openServerScreen(ServerScreen.SERVER_SETTINGS);
  await page
    .getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY)
    .filter({ hasText: 'Plugins' })
    .click();
  await page.getByRole('tab', { name: 'Marketplace' }).click();
  await expect
    .element(page.getByText('Soundboard', { exact: true }))
    .toBeVisible();

  await snapshot('plugin-marketplace');
});

test('search dialog matches the Paper design', async () => {
  openDialog(Dialog.SEARCH);
  await expect.element(page.getByTestId(TestId.SEARCH_INPUT)).toBeVisible();

  await snapshot('search-dialog');
});

test('create channel uses the Paper sheet geometry and selectable options', async () => {
  openDialog(Dialog.CREATE_CHANNEL);
  await expect.element(page.getByRole('dialog')).toBeVisible();
  const dialog = page.getByRole('dialog').element();
  expect(dialog.getBoundingClientRect().height).toBe(620);
  expect(dialog.getBoundingClientRect().width).toBe(410);
  await expect
    .element(page.getByText('Give your community a place to talk.'))
    .toBeVisible();
  const text = page.getByRole('radio', { name: 'Text channel' });
  const voice = page.getByRole('radio', { name: 'Voice channel' });
  expect(text.element().getAttribute('aria-checked')).toBe('true');
  expect(text.element().getBoundingClientRect().height).toBe(50);
  expect(getComputedStyle(text.element()).paddingLeft).toBe('15px');
  expect(getComputedStyle(text.element()).borderTopWidth).toBe('1px');
  await voice.click();
  expect(voice.element().getAttribute('aria-checked')).toBe('true');
  expect(text.element().getAttribute('aria-checked')).toBe('false');
  const footer = dialog.querySelector('[data-slot="dialog-footer"]')!;
  expect(footer.getBoundingClientRect().height).toBe(74);
  expect(footer.getBoundingClientRect().bottom).toBeCloseTo(
    dialog.getBoundingClientRect().bottom - 1,
    0
  );
  expect(dialog.querySelector('input')!.getBoundingClientRect().height).toBe(
    50
  );
  expect(
    dialog.querySelectorAll('[data-slot="dialog-footer"] button')
  ).toHaveLength(1);
});

test('create channel dialog matches the Paper design', async () => {
  openDialog(Dialog.CREATE_CHANNEL);
  await expect.element(page.getByRole('dialog')).toBeVisible();

  await snapshot('create-channel-dialog');
});

test('create category dialog matches the Paper design', async () => {
  openDialog(Dialog.CREATE_CATEGORY);
  await expect.element(page.getByRole('dialog')).toBeVisible();

  await snapshot('create-category-dialog');
});

test('create invite dialog matches the Paper design', async () => {
  openDialog(Dialog.CREATE_INVITE, { refetch: () => undefined });
  await expect.element(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox').first().fill('rnd-community-invite');

  await snapshot('create-invite-dialog');
});

test('profile setup dialog matches the Paper design', async () => {
  openDialog(Dialog.WELCOME_PROFILE_SETUP);
  await expect.element(page.getByRole('dialog')).toBeVisible();

  // The previous dialog's input can leave the pointer over the upload cover.
  await page.getByText('sharkord', { exact: true }).hover({ force: true });
  await snapshot('profile-setup-dialog');
});

test('voice diagnostics dialog matches the Paper design', async () => {
  clearVoiceDebugEvents();
  openDialog(Dialog.VOICE_DEBUG);
  await expect.element(page.getByRole('dialog')).toBeVisible();

  await expect(page).toMatchScreenshot('voice-diagnostics-dialog', {
    comparatorOptions: { allowedMismatchedPixelRatio: 0.0002 },
    timeout: 3_000
  });
});

test('same-author messages across midnight retain both date separators', async () => {
  const { setChannelMessages } =
    await import('@/features/server/messages/actions');
  const client = trpc.getTRPCClient();
  const original = await client.messages.get.query({
    channelId: 1,
    limit: 50,
    cursor: null
  });
  const template = original.messages[0];
  try {
    setChannelMessages(
      1,
      [
        {
          ...template,
          id: 900001,
          content: 'Before midnight',
          createdAt: Date.UTC(2026, 9, 8, 23, 59, 50)
        },
        {
          ...template,
          id: 900002,
          content: 'After midnight',
          createdAt: Date.UTC(2026, 9, 9, 0, 0, 10)
        }
      ],
      false
    );
    await expect
      .element(page.getByText('After midnight', { exact: true }))
      .toBeVisible();
    expect(
      Array.from(
        document.querySelectorAll('[data-message-date]'),
        (el) => el.textContent
      )
    ).toEqual(['October 8th, 2026', 'Today']);
    expect(
      Array.from(
        document.querySelectorAll('[data-messages-container] time'),
        (el) => el.getAttribute('datetime')
      )
    ).toEqual(['2026-10-08T23:59:50.000Z', '2026-10-09T00:00:10.000Z']);
    setChannelMessages(1, [...original.messages].reverse(), true);
    await waitForRender();
    expect(document.querySelector('[data-channel-welcome]')).toBeNull();
  } finally {
    setChannelMessages(1, [...original.messages].reverse(), false);
  }
});

test('create-channel dialog submits and composer uploads and persists a message', async () => {
  const { store } = await import('@/features/store');
  const client = trpc.getTRPCClient();
  openDialog(Dialog.CREATE_CHANNEL, { categoryId: 1 });
  await page
    .getByRole('textbox', { name: 'Channel name', exact: true })
    .fill('release-regression');
  await page.getByRole('radio', { name: 'Voice channel' }).click();
  await expect
    .element(page.getByRole('radio', { name: 'Voice channel' }))
    .toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Text channel' }).click();
  await page
    .getByRole('button', { name: 'Create channel', exact: true })
    .click();
  const item = page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'release-regression' });
  await expect.element(item).toBeVisible();
  const channel = store
    .getState()
    .server.channels.find((c) => c.name === 'release-regression')!;
  expect(channel.type).toBe('TEXT');
  expect(channel.categoryId).toBe(1);
  try {
    await item.click();
    await expect
      .element(
        page.getByText('Welcome to #release-regression', { exact: true })
      )
      .toBeVisible();
    const editor = page.elementLocator(
      document.querySelector<HTMLElement>('.compose-container .ProseMirror')!
    );
    await editor.fill('Release integration submission');
    const input = document.querySelector<HTMLInputElement>(
      '.compose-container input[type=file]'
    )!;
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['release-upload-fixture'], 'release-check.txt', {
        type: 'text/plain'
      })
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await expect
      .element(page.getByText('release-check.txt', { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Send message', exact: true }))
      .toBeEnabled();
    await page
      .getByRole('button', { name: 'Send message', exact: true })
      .click();
    await expect
      .element(
        page
          .getByTestId(TestId.MESSAGE_ITEM)
          .filter({ hasText: 'Release integration submission' })
      )
      .toBeVisible();
    const saved = await client.messages.get.query({
      channelId: channel.id,
      limit: 50,
      cursor: null
    });
    expect(saved.messages).toHaveLength(1);
    expect(saved.messages[0].content).toContain(
      'Release integration submission'
    );
    expect(saved.messages[0].files).toHaveLength(1);
    expect(saved.messages[0].files[0].originalName).toBe('release-check.txt');
    const { getFileUrl } = await import('@/helpers/get-file-url');
    const download = await fetch(getFileUrl(saved.messages[0].files[0]));
    expect(download.ok).toBe(true);
    expect(await download.text()).toBe('release-upload-fixture');
    expect(
      document.querySelector('.compose-container .ProseMirror')!.textContent
    ).toBe('');
  } finally {
    setSelectedChannelId(1);
    await client.channels.delete.mutate({ channelId: channel.id });
    await expect.element(item).not.toBeInTheDocument();
  }
});

test('paginated history suppresses welcome until the oldest page and keeps unique day boundaries', async () => {
  const { ChannelType } = await import('@sharkord/shared');
  const client = trpc.getTRPCClient();
  const original = await client.messages.get.query({
    channelId: 1,
    limit: 50,
    cursor: null
  });
  const template = original.messages[0];
  const channelId = await client.channels.add.mutate({
    name: 'pagination-regression',
    type: ChannelType.TEXT,
    categoryId: 1
  });
  const older = {
    ...template,
    id: 910001,
    channelId,
    content: 'Oldest paginated message',
    createdAt: Date.UTC(2026, 9, 7, 12)
  };
  const recent = Array.from({ length: 50 }, (_, index) => ({
    ...template,
    id: 910002 + index,
    channelId,
    content:
      index === 49 ? 'Latest paginated message' : `Paginated message ${index}`,
    createdAt: Date.UTC(2026, 9, index < 25 ? 8 : 9, 9, (index % 25) * 2)
  }));
  const query = vi
    .fn(client.messages.get.query)
    .mockImplementation(async (input) => {
      if (input.channelId !== channelId)
        return client.messages.get.query(input);
      return input.cursor
        ? { messages: [older], nextCursor: null, hasNewer: false }
        : {
            messages: [...recent].reverse(),
            nextCursor: { id: recent[0].id, createdAt: recent[0].createdAt },
            hasNewer: false
          };
    });
  const fixtureClient = new Proxy(client, {
    get(target, property) {
      if (property !== 'messages') return Reflect.get(target, property);
      return new Proxy(target.messages, {
        get(messages, key) {
          if (key !== 'get') return Reflect.get(messages, key);
          return new Proxy(messages.get, {
            get(get, method) {
              return method === 'query' ? query : Reflect.get(get, method);
            }
          });
        }
      });
    }
  });
  vi.mocked(trpc.getTRPCClient).mockReturnValue(fixtureClient);
  try {
    setSelectedChannelId(channelId);
    await expect
      .element(page.getByText('Latest paginated message', { exact: true }))
      .toBeVisible();
    expect(document.querySelector('[data-channel-welcome]')).toBeNull();
    expect(
      Array.from(
        document.querySelectorAll('[data-message-date]'),
        (el) => el.textContent
      )
    ).toEqual(['October 8th, 2026', 'Today']);
    await waitForRender();
    await waitForRender();
    const container = document.querySelector<HTMLElement>(
      '[data-messages-container]'
    )!;
    expect(container.scrollHeight).toBeGreaterThan(container.clientHeight);
    await expect
      .poll(
        () => {
          container.scrollTop = 0;
          container.dispatchEvent(new Event('scroll', { bubbles: true }));
          return query.mock.calls.length;
        },
        { timeout: 3000 }
      )
      .toBe(2);
    await expect
      .element(
        page.getByText('Welcome to #pagination-regression', { exact: true })
      )
      .toBeInTheDocument();
    await waitForRender();
    container.scrollTop = 0;
    await expect
      .element(
        page.getByText('Welcome to #pagination-regression', { exact: true })
      )
      .toBeVisible();
    expect(
      Array.from(
        document.querySelectorAll('[data-message-date]'),
        (el) => el.textContent
      )
    ).toEqual(['October 7th, 2026', 'October 8th, 2026', 'Today']);
    expect(
      document.querySelector('[data-messages-container]')!.textContent
    ).toContain('Oldest paginated message');
  } finally {
    vi.mocked(trpc.getTRPCClient).mockReturnValue(client);
    setSelectedChannelId(1);
    await client.channels.delete.mutate({ channelId });
  }
});

test('redesigned channel header preserves upstream mute and unmute control', async () => {
  const { toggleChannelMuted } = await import('@/features/app/actions');
  toggleChannelMuted(1);
  await waitForRender();
  const icon = document.querySelector<SVGElement>('.lucide-bell-off')!;
  expect(icon).not.toBeNull();
  const button = page.elementLocator(icon.closest('button')!);
  try {
    await button.hover();
    await expect
      .element(
        page.getByRole('tooltip', { name: 'Channel muted, click to unmute' })
      )
      .toBeVisible();
    await button.click();
    await expect
      .poll(() => document.querySelector('.lucide-bell-off'))
      .toBeNull();
  } finally {
    if (document.querySelector('.lucide-bell-off')) toggleChannelMuted(1);
  }
});
