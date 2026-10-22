import { TestId } from '@dodecagon/shared';
import type { Page } from '@playwright/test';
import { expect, loginAs, test } from './fixtures';
import { openChannel } from './helpers/channels';
import { messageByText, sendMessage } from './helpers/messages';

// the seeded conversation belongs to user a and user b, and sessions.pw.ts kicks one and takes
// the other offline. this opens its own between two users nobody disconnects
const READER = {
  identity: 'testuser',
  name: 'Test User',
  password: 'password123'
};

const timestamp = Date.now();
const runToken = timestamp.toString();
const RUN_ID = runToken.slice(-8);

const dmItem = (page: Page, name: string) =>
  page.getByTestId(TestId.DM_ITEM).filter({ hasText: name });

const disclosure = (page: Page) =>
  page.getByRole('button', { name: 'Direct Channels', exact: true });

// dms.test.ts covers the read state itself: the count clears for a participant and stays clear
// until a newer message arrives. what only a browser shows is the badge following it, which is
// the half that broke in R2, where dms came up unread and would not clear on open
test('shared direct channels bootstrap unread and follow live reads across sessions', async ({
  browser
}, testInfo) => {
  const senderContext = await browser.newContext();
  const readerContext = await browser.newContext();
  const otherReaderContext = await browser.newContext();

  try {
    const sender = await senderContext.newPage();
    const reader = await readerContext.newPage();
    const otherReader = await otherReaderContext.newPage();

    await loginAs(sender, 'testowner', 'password123');
    await loginAs(reader, READER.identity, READER.password);
    await openChannel(reader, 'General');
    await expect(disclosure(reader)).toHaveAttribute('aria-expanded', 'false');
    await expect(reader.getByTestId(TestId.DM_ITEM)).toHaveCount(0);

    await sender
      .getByTestId(TestId.MEMBER_ITEM)
      .filter({ hasText: READER.name })
      .click();
    await sender.getByTestId(TestId.USER_POPOVER_DM).click();

    await expect(
      sender.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
    ).toBeVisible();

    const firstMessage = `dm badge check ${RUN_ID}`;
    await sendMessage(sender, firstMessage);
    await sendMessage(sender, `second unread ${RUN_ID}`);

    await loginAs(otherReader, READER.identity, READER.password);
    await expect(disclosure(otherReader)).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    const conversation = dmItem(reader, 'Test Owner');
    const otherConversation = dmItem(otherReader, 'Test Owner');
    for (const session of [reader, otherReader]) {
      await expect(
        dmItem(session, 'Test Owner').getByTestId(TestId.UNREAD_COUNT)
      ).toHaveText('2', { timeout: 15_000 });
      await expect(session.getByTestId(TestId.DM_ITEM)).toHaveCount(1);
      await expect(
        session.getByTestId(TestId.CHANNEL_ITEM).filter({ hasText: 'General' })
      ).toBeVisible();
    }
    const unreadScreenshot = testInfo.outputPath('direct-channels-unread.png');
    await reader.screenshot({ path: unreadScreenshot });
    await testInfo.attach('unread direct channel', {
      path: unreadScreenshot,
      contentType: 'image/png'
    });

    await conversation.click();
    await expect(conversation).toHaveCount(0);
    await expect(otherConversation).toHaveCount(0);
    await expect(messageByText(reader, firstMessage)).toBeVisible();
    await expect(
      reader.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
    ).toBeVisible();
    await expect(
      reader.getByTestId(TestId.CHANNEL_ITEM).filter({ hasText: 'General' })
    ).toBeVisible();

    await openChannel(reader, 'General');
    await expect(messageByText(reader, firstMessage)).toHaveCount(0);
    await disclosure(reader).click();
    await expect(conversation).toBeVisible();
    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toHaveCount(0);
    await conversation.click();
    await expect(messageByText(reader, firstMessage)).toBeVisible();
    await disclosure(reader).click();
    await expect(conversation).toHaveCount(0);
    await expect(messageByText(reader, firstMessage)).toBeVisible();

    await openChannel(reader, 'General');
    await sendMessage(sender, `new unread after read ${RUN_ID}`);
    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toHaveText('1');
    await expect(otherConversation.getByTestId(TestId.UNREAD_COUNT)).toHaveText(
      '1'
    );
    await otherConversation.click();
    await expect(conversation).toHaveCount(0);
    await expect(otherConversation).toHaveCount(0);
    await expect(messageByText(otherReader, firstMessage)).toBeVisible();
    await disclosure(reader).click();
    await expect(conversation).toBeVisible();
    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toHaveCount(0);
    const readScreenshot = testInfo.outputPath('direct-channels-read.png');
    await otherReader.screenshot({ path: readScreenshot });
    await testInfo.attach('read DM remains open', {
      path: readScreenshot,
      contentType: 'image/png'
    });
  } finally {
    await senderContext.close().catch(() => {});
    await readerContext.close().catch(() => {});
    await otherReaderContext.close().catch(() => {});
  }
});
