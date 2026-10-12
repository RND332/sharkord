import { TestId } from '@sharkord/shared';
import { beforeAll, expect, test } from 'vitest';
import { page } from 'vitest/browser';

const addRoot = (id: string) => {
  const element = document.createElement('div');
  element.id = id;
  document.body.append(element);
};

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
});

test('connect page matches the Paper design', async () => {
  await expect.element(page.getByTestId(TestId.CONNECT_FORM)).toBeVisible();
  await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('rnd332');
  await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH).click();

  await expect.element(page.getByTestId(TestId.CONNECT_BUTTON)).toBeEnabled();
  // Capture the application document, not the runner page's scroll state.
  await expect(page.elementLocator(document.documentElement)).toMatchScreenshot(
    'connect-page',
    { timeout: 3_000 }
  );
});
