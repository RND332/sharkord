import { expect, test } from '@playwright/test';

test('server-rendered document hydrates without React recoverable errors', async ({
  page
}) => {
  const hydrationErrors: string[] = [];
  const isHydrationError = (message: string) =>
    /Minified React error #(?:418|423)|Hydration failed|hydration mismatch/i.test(
      message
    );

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
  // the marker of the root route shows that the browser took over the html of
  // the server, only then the errors of the hydration are complete
  await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
  expect(hydrationErrors).toEqual([]);
});
