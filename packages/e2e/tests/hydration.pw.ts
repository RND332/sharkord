import { expect, test } from '@playwright/test';

test('server-rendered document hydrates without React recoverable errors', async ({ page }) => {
  const hydrationErrors: string[] = [];
  const isHydrationError = (message: string) =>
    /Minified React error #(?:418|423)|Hydration failed|hydration mismatch/i.test(message);

  page.on('pageerror', (error) => {
    if (isHydrationError(error.message)) hydrationErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && isHydrationError(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.locator('#portal')).toBeAttached();
  await expect(page.locator('body')).not.toBeEmpty();
  expect(hydrationErrors).toEqual([]);
});
