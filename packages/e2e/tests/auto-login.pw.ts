import { TestId } from '@dodecagon/shared';
import { expect, test } from './fixtures';

test.describe('Auto Login', () => {
  test('should display the auto-login switch on the connect screen', async ({
    page
  }) => {
    await page.goto('/');

    const autoLoginSwitch = page.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH);
    await expect(autoLoginSwitch).toBeVisible();
    await expect(autoLoginSwitch).toContainText('Login automatically');
  });

  test('should have the auto-login switch unchecked by default', async ({
    page
  }) => {
    await page.goto('/');

    const switchButton = page
      .getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH)
      .locator('[role="switch"]');
    await expect(switchButton).toHaveAttribute('data-unchecked');
  });

  test('should toggle the auto-login switch', async ({ page }) => {
    await page.goto('/');

    const autoLoginSwitch = page.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH);
    const switchButton = autoLoginSwitch.locator('[role="switch"]');

    await autoLoginSwitch.click();
    await expect(switchButton).toHaveAttribute('data-checked');

    await autoLoginSwitch.click();
    await expect(switchButton).toHaveAttribute('data-unchecked');
  });

  test('should restore the auto-login switch state from localStorage', async ({
    page
  }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('dodecagon-auto-login', 'true');
    });

    await page.reload();

    const switchButton = page
      .getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH)
      .locator('[role="switch"]');
    await expect(switchButton).toHaveAttribute('data-checked');
  });

  test('should show the connect screen when auto-login is enabled but no token is saved', async ({
    page
  }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('dodecagon-auto-login', 'true');
      localStorage.removeItem('dodecagon-auto-login-token');
    });

    await page.reload();

    const connectButton = page.getByTestId(TestId.CONNECT_BUTTON);
    await expect(connectButton).toBeVisible();
  });

  test('should show the connect screen when auto-login is disabled even with a saved token', async ({
    page
  }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('dodecagon-auto-login', 'false');
      localStorage.setItem('dodecagon-auto-login-token', 'some-token');
    });

    await page.reload();

    const connectButton = page.getByTestId(TestId.CONNECT_BUTTON);
    await expect(connectButton).toBeVisible();
  });

  test('should attempt auto-connect when auto-login is enabled and token is saved', async ({
    page
  }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('dodecagon-auto-login', 'true');
      localStorage.setItem('dodecagon-auto-login-token', 'invalid-token');
    });

    await page.reload();

    // the token is invalid so it should fall back to the connect screen
    const connectButton = page.getByTestId(TestId.CONNECT_BUTTON);
    await expect(connectButton).toBeVisible({ timeout: 10_000 });

    // the screen of the server is already there, the attempt of the auto login
    // happens after the hydration, so the flag has to be waited for
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('dodecagon-auto-login'))
      )
      .toBe('false');

    const savedToken = await page.evaluate(() =>
      localStorage.getItem('dodecagon-auto-login-token')
    );
    expect(savedToken).toBeNull();
  });
});
