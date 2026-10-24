import { TestId } from '@dodecagon/shared';
import { expect, test, waitForHydration } from './fixtures';

// the server renders the request in the language of the browser, but the
// language of the user can be another one. the browser has to load the
// resources of that language, otherwise the interface shows the raw keys
test('shows the language of the user when the request carries another one', async ({
  page
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('dodecagon-language', 'en');
  });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  await page.goto('/');
  await waitForHydration(page);

  const identity = page.getByTestId(TestId.CONNECT_IDENTITY_INPUT);
  const password = page.getByTestId(TestId.CONNECT_PASSWORD_INPUT);

  await expect(identity).toBeVisible();
  await expect(identity).toHaveAttribute('aria-label', 'Identity');
  await expect(password).toHaveAttribute('aria-label', 'Password');
});
