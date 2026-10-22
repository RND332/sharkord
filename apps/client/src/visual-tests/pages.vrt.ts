import { TestId } from '@dodecagon/shared';
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

test('bundled typography preserves real italic text', async () => {
  await expect.element(page.getByTestId(TestId.CONNECT_FORM)).toBeVisible();
  const faces = await document.fonts.load('italic 16px "Inter Variable"');
  expect(
    faces.some((font) => font.style === 'italic' && font.status === 'loaded')
  ).toBe(true);
});

test('interface loads the bundled Inter Variable font', async () => {
  await expect.element(page.getByTestId(TestId.CONNECT_FORM)).toBeVisible();
  await document.fonts.ready;
  expect(getComputedStyle(document.body).fontFamily).toContain(
    'Inter Variable'
  );
  const loadedFont = Array.from(document.fonts).find(
    (font) => font.family.includes('Inter Variable') && font.status === 'loaded'
  );
  expect(loadedFont).toBeDefined();
});

test('dark theme uses the approved Discord palette', async () => {
  await expect.element(page.getByTestId(TestId.CONNECT_FORM)).toBeVisible();
  const styles = getComputedStyle(document.documentElement);
  const palette = {
    '--rail': '#1e1f22',
    '--nav': '#2b2d31',
    '--canvas': '#313338',
    '--panel': '#383a40',
    '--raised': '#404249',
    '--line': '#44464d',
    '--foreground': '#f2f3f5',
    '--muted-foreground': '#b5bac1',
    '--subtle-foreground': '#b0b4bc',
    '--primary': '#5865f2',
    '--primary-foreground': '#ffffff',
    '--success': '#57d18a',
    '--destructive': '#f5858f',
    '--control-border': '#969ca5',
    '--danger-solid': '#b3263e',
    '--accent-text': '#aeb5ff',
    '--ring': '#c2c7ff'
  };

  for (const [token, value] of Object.entries(palette)) {
    expect(styles.getPropertyValue(token).trim(), token).toBe(value);
  }
});

test('form controls use recessed fields and a green enabled switch', async () => {
  const input = page.getByTestId(TestId.CONNECT_IDENTITY_INPUT);
  await expect.element(input).toBeVisible();
  const fieldStyle = getComputedStyle(input.element());
  expect(fieldStyle.backgroundColor).toBe('rgb(30, 31, 34)');
  expect(fieldStyle.borderColor).toBe('rgb(150, 156, 165)');
  expect(fieldStyle.borderRadius).toBe('8px');
  expect(
    getComputedStyle(page.getByTestId(TestId.CONNECT_BUTTON).element())
      .borderRadius
  ).toBe('8px');

  const toggle = page
    .getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH)
    .getByRole('switch');
  const wasEnabled = toggle.element().getAttribute('aria-checked') === 'true';
  try {
    if (!wasEnabled) await toggle.click();
    await expect
      .poll(() => getComputedStyle(toggle.element()).backgroundColor)
      .toBe('rgb(36, 128, 70)');
  } finally {
    if (!wasEnabled) await toggle.click();
  }
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
