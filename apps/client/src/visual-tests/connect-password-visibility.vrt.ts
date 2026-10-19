import { setInfo } from '@/features/server/actions';
import { infoSelector } from '@/features/server/selectors';
import { store } from '@/features/store';
import { suppressOidcAutoRedirect } from '@/helpers/oidc';
import { LocalStorageKey, SessionStorageKey } from '@/helpers/storage';
import { i18n } from '@/i18n';
import { TestId } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi
} from 'vitest';
import { page, userEvent } from 'vitest/browser';

let root: Root;

const password = () => page.getByTestId(TestId.CONNECT_PASSWORD_INPUT);
const showPassword = () =>
  page.getByRole('button', { name: 'Show password', exact: true });
const hidePassword = () =>
  page.getByRole('button', { name: 'Hide password', exact: true });

beforeAll(async () => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.replaceChildren();

  for (const id of ['root', 'portal', 'imagePortal']) {
    const element = document.createElement('div');
    element.id = id;
    document.body.append(element);
  }

  const { ClientApp } = await import('../main');
  root = createRoot(document.getElementById('root')!);
  root.render(createElement(ClientApp));
  await password().fill('');
  await document.fonts.ready;
});

beforeEach(async () => {
  await i18n.changeLanguage('en');
  const field = password();

  if (field.element().getAttribute('type') === 'text') {
    await hidePassword().click();
  }

  await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('rnd332');
  await field.fill('');
});

afterEach(() => vi.restoreAllMocks());
afterAll(() => root.unmount());

test('pointer show and hide preserve the same password input, value and focus', async () => {
  const field = password();
  const input = field.element();
  await field.fill('secret-A7!');
  await expect.element(field).toHaveAttribute('type', 'password');
  await showPassword().click();
  await expect.element(field).toHaveAttribute('type', 'text');
  await expect.element(field).toHaveValue('secret-A7!');
  await expect.element(field).toHaveFocus();
  expect(field.element()).toBe(input);
  await userEvent.keyboard('more');
  await hidePassword().click();
  await expect.element(field).toHaveAttribute('type', 'password');
  await expect.element(field).toHaveValue('secret-A7!more');
  await expect.element(field).toHaveFocus();
  expect(field.element()).toBe(input);
});

test.each([
  ['collapsed caret', 4, 4, 'forward'],
  ['selected range', 2, 7, 'forward'],
  ['backward selection', 3, 8, 'backward']
] as const)(
  'show and hide preserve a %s',
  async (_name, start, end, direction) => {
    const field = password();
    await field.fill('selection-A7!');
    const input = field.element() as HTMLInputElement;
    input.setSelectionRange(start, end, direction);
    await showPassword().click();
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input.selectionDirection).toBe(direction);
    await hidePassword().click();
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input.selectionDirection).toBe(direction);
  }
);

test.each(['{Enter}', '{Space}'])(
  'keyboard %s toggles without submitting and restores password focus',
  async (key) => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const field = password();
    await field.fill('keyboard-9!');
    await userEvent.tab();
    await expect.element(showPassword()).toHaveFocus();
    expect(showPassword().element().matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(showPassword().element()).boxShadow).not.toBe(
      'none'
    );
    await userEvent.keyboard(key);
    await expect.element(field).toHaveAttribute('type', 'text');
    await expect.element(field).toHaveFocus();
    await userEvent.tab();
    await expect.element(hidePassword()).toHaveFocus();
    await userEvent.keyboard(key);
    await expect.element(field).toHaveAttribute('type', 'password');
    await expect.element(field).toHaveValue('keyboard-9!');
    await expect.element(field).toHaveFocus();
    expect(
      fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/login'))
    ).toHaveLength(0);
  }
);

test('empty password can be shown without enabling Connect or changing auto-login', async () => {
  const autoLogin = localStorage.getItem(LocalStorageKey.AUTO_LOGIN);
  await showPassword().click();
  await expect.element(password()).toHaveValue('');
  await expect.element(password()).toHaveFocus();
  await expect.element(page.getByTestId(TestId.CONNECT_BUTTON)).toBeDisabled();
  expect(localStorage.getItem(LocalStorageKey.AUTO_LOGIN)).toBe(autoLogin);
  expect(localStorage.getItem(LocalStorageKey.AUTO_LOGIN_TOKEN)).toBeNull();
  expect(sessionStorage.getItem(SessionStorageKey.TOKEN)).toBeNull();
  await hidePassword().click();
});

test('pointer activation never submits and preserves password-manager attributes', async () => {
  const fetchSpy = vi.spyOn(window, 'fetch');
  await password().fill('pointer-8!');
  await showPassword().click();
  await expect
    .element(password())
    .toHaveAttribute('autocomplete', 'current-password');
  await expect.element(password()).toHaveAttribute('name', 'password');
  await expect.element(password()).toHaveAttribute('spellcheck', 'false');
  await expect.element(password()).toHaveAttribute('autocapitalize', 'none');
  await expect.element(hidePassword()).toHaveAttribute('type', 'button');
  expect(hidePassword().element().hasAttribute('aria-pressed')).toBe(false);
  const controlledInputId = hidePassword()
    .element()
    .getAttribute('aria-controls');
  expect(controlledInputId).toBe(password().element().id);
  expect(controlledInputId).not.toBe('');
  await hidePassword().click();
  expect(
    fetchSpy.mock.calls.filter(([url]) => String(url).endsWith('/login'))
  ).toHaveLength(0);
});

test.each([
  ['en', 'Show', 'Hide', 'Show password', 'Hide password'],
  ['cs', 'Zobrazit', 'Skrýt', 'Zobrazit heslo', 'Skrýt heslo'],
  ['es', 'Mostrar', 'Ocultar', 'Mostrar contraseña', 'Ocultar contraseña'],
  [
    'fr',
    'Afficher',
    'Masquer',
    'Afficher le mot de passe',
    'Masquer le mot de passe'
  ],
  ['it', 'Mostra', 'Nascondi', 'Mostra password', 'Nascondi password'],
  ['ru', 'Показать', 'Скрыть', 'Показать пароль', 'Скрыть пароль'],
  ['zh', '显示', '隐藏', '显示密码', '隐藏密码'],
  ['pt-BR', 'Mostrar', 'Ocultar', 'Mostrar senha', 'Ocultar senha']
] as const)(
  'localized %s labels describe the action without changing the value',
  async (locale, show, hide, showLabel, hideLabel) => {
    await password().fill('locale-7!');
    await i18n.changeLanguage(locale);
    const showButton = page.getByRole('button', {
      name: showLabel,
      exact: true
    });
    await expect.element(showButton).toHaveTextContent(show);
    await showButton.click();
    const hideButton = page.getByRole('button', {
      name: hideLabel,
      exact: true
    });
    await expect.element(hideButton).toHaveTextContent(hide);
    await expect.element(password()).toHaveValue('locale-7!');
    await hideButton.click();
    await expect.element(password()).toHaveAttribute('type', 'password');
    await expect.element(password()).toHaveFocus();
    await i18n.changeLanguage('en');
  }
);

test('password action matches Paper without resizing the existing field', async () => {
  const input = password().element();
  const initialRect = input.getBoundingClientRect();
  const style = getComputedStyle(input);
  expect(initialRect.height).toBe(44);
  expect(style.borderRadius).toBe('8px');
  expect(style.backgroundColor).toBe('rgb(30, 31, 34)');
  for (const edge of [
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth'
  ] as const) {
    expect(style[edge]).toBe('1px');
  }
  const button = showPassword().element();
  const buttonStyle = getComputedStyle(button);
  expect(buttonStyle.fontSize).toBe('12px');
  expect(buttonStyle.lineHeight).toBe('17px');
  expect(buttonStyle.fontWeight).toBe('500');
  expect(buttonStyle.color).toBe('rgb(242, 243, 245)');
  expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  await showPassword().click();
  const nextRect = input.getBoundingClientRect();
  expect([nextRect.x, nextRect.y, nextRect.width, nextRect.height]).toEqual([
    initialRect.x,
    initialRect.y,
    initialRect.width,
    initialRect.height
  ]);
});

test('SSO-only mode does not expose the local-password visibility control', async () => {
  const info = infoSelector(store.getState());
  const previousSuppression = sessionStorage.getItem(
    SessionStorageKey.OIDC_NO_AUTO_REDIRECT
  );
  expect(info).toBeDefined();
  if (!info) return;

  try {
    suppressOidcAutoRedirect();
    setInfo({ ...info, oidcEnabled: true, oidcDisableLocalLogin: true });
    await expect
      .element(page.getByTestId(TestId.CONNECT_OIDC_BUTTON))
      .toBeVisible();
    await expect.element(password()).not.toBeInTheDocument();
    await expect.element(showPassword()).not.toBeInTheDocument();
    await expect.element(hidePassword()).not.toBeInTheDocument();
  } finally {
    if (previousSuppression === null) {
      sessionStorage.removeItem(SessionStorageKey.OIDC_NO_AUTO_REDIRECT);
    } else {
      sessionStorage.setItem(
        SessionStorageKey.OIDC_NO_AUTO_REDIRECT,
        previousSuppression
      );
    }
    setInfo(info);
    await expect.element(password()).toBeVisible();
  }
});

test('submitting a visible password masks it and preserves the real login error', async () => {
  const fetchSpy = vi.spyOn(window, 'fetch');
  await password().fill('incorrect-password');
  await showPassword().click();
  await userEvent.keyboard('{Enter}');
  await expect
    .element(page.getByRole('alert').filter({ hasText: 'Invalid credentials' }))
    .toBeVisible();
  await expect.element(password()).toHaveAttribute('type', 'password');
  await expect.element(password()).toHaveValue('incorrect-password');
  await expect.element(showPassword()).toBeVisible();
  const loginCalls = fetchSpy.mock.calls.filter(([url]) =>
    String(url).endsWith('/login')
  );
  expect(loginCalls).toHaveLength(1);
  expect(JSON.parse(String(loginCalls[0]![1]?.body))).toEqual({
    identity: 'rnd332',
    password: 'incorrect-password'
  });
  expect(sessionStorage.getItem(SessionStorageKey.TOKEN)).toBeNull();
});

test('native form submission sends the visible password exactly once', async () => {
  const fetchSpy = vi.spyOn(window, 'fetch');
  await password().fill('incorrect-password');
  await showPassword().click();
  const form = page
    .getByTestId(TestId.CONNECT_FORM)
    .element() as HTMLFormElement;
  form.requestSubmit();
  await expect
    .element(page.getByRole('alert').filter({ hasText: 'Invalid credentials' }))
    .toBeVisible();
  const loginCalls = fetchSpy.mock.calls.filter(([url]) =>
    String(url).endsWith('/login')
  );
  expect(loginCalls).toHaveLength(1);
  expect(JSON.parse(String(loginCalls[0]![1]?.body))).toEqual({
    identity: 'rnd332',
    password: 'incorrect-password'
  });
  await expect.element(password()).toHaveAttribute('type', 'password');
  await expect.element(password()).toHaveValue('incorrect-password');
});

test('Connect still authenticates with the entered password after toggling visibility', async () => {
  await password().fill('password123');
  await showPassword().click();
  await page.getByTestId(TestId.CONNECT_BUTTON).click();
  await expect
    .element(
      page.getByTestId(TestId.CHANNEL_ITEM).filter({ hasText: 'general' })
    )
    .toBeVisible();
  expect(sessionStorage.getItem(SessionStorageKey.TOKEN)).toBeTruthy();
  expect(localStorage.getItem(LocalStorageKey.IDENTITY)).toBe('rnd332');
  expect(localStorage.getItem(LocalStorageKey.AUTO_LOGIN)).toBe('false');
  expect(localStorage.getItem(LocalStorageKey.AUTO_LOGIN_TOKEN)).toBeNull();
});
