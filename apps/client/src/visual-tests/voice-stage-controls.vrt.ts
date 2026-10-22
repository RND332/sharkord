import { PinnedCardType } from '@/components/channel-view/voice/hooks/use-pin-card-controller';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  addUserToVoiceChannel,
  joinVoice,
  setPinnedCard,
  updateOwnVoiceState
} from '@/features/server/voice/actions';
import { TestId } from '@dodecagon/shared';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../index.css';

vi.mock('@/lib/trpc', { spy: true });

const addRoot = (id: string) => {
  const element = document.createElement('div');
  element.id = id;
  document.body.append(element);
};

const waitForRender = () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  return promise;
};

const participantsButton = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[aria-label]')
  ).find((button) =>
    /participants/i.test(button.getAttribute('aria-label') ?? '')
  );

beforeAll(async () => {
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
  setPinnedCard(undefined);
  updateOwnVoiceState({ sharingScreen: false });
});

test('the hide participants control stays clickable over a focused card', async () => {
  addUserToVoiceChannel(3, 2, {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  });
  addUserToVoiceChannel(2, 2, {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  });
  await joinVoice(2);
  setSelectedChannelId(2);
  await waitForRender();
  await waitForRender();

  setPinnedCard({
    id: 'user-3',
    type: PinnedCardType.USER,
    userId: 3
  });
  await waitForRender();
  await waitForRender();

  const stage = document.querySelector<HTMLElement>('.group\\/voice-stage');
  expect(stage).not.toBeNull();

  const hide = participantsButton();
  expect(hide).toBeDefined();
  expect(hide!.getAttribute('aria-label')).toBe('Hide participants');

  await page.elementLocator(stage!).hover();
  await waitForRender();

  // the control must be the hit target, not the focused card's pin overlay
  const rect = hide!.getBoundingClientRect();
  const topElement = document.elementFromPoint(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2
  );
  expect(topElement).not.toBeNull();
  expect(hide!.contains(topElement)).toBe(true);

  const strip = document.querySelector<HTMLElement>('[inert]');
  expect(strip).toBeNull();

  await userEvent.click(hide!);
  await waitForRender();
  await waitForRender();

  const hiddenStrip = document.querySelector<HTMLElement>('[inert]');
  expect(hiddenStrip).not.toBeNull();
  expect(hiddenStrip!.getBoundingClientRect().height).toBe(0);
  expect(participantsButton()!.getAttribute('aria-label')).toBe(
    'Show participants'
  );

  await userEvent.click(participantsButton()!);
  await waitForRender();
  await waitForRender();

  expect(document.querySelector('[inert]')).toBeNull();
  expect(participantsButton()!.getAttribute('aria-label')).toBe(
    'Hide participants'
  );
});

test('a speaking participant shows the green outline from the Paper design', async () => {
  const tiles = Array.from(
    document.querySelectorAll<HTMLElement>('.group\\/voice-user-card')
  );
  expect(tiles.length).toBeGreaterThan(0);

  for (const tile of tiles) {
    expect(getComputedStyle(tile).borderColor).toBe('rgb(68, 70, 77)');
  }
});
