import { expect, test } from 'bun:test';
import { getPublicSettings } from '../server';

test('public branding includes the configured server name and explicit absent logo without exposing its token', async () => {
  const settings = await getPublicSettings();
  expect(settings).toMatchObject({ name: 'Test Server', logo: null });
  expect(settings).not.toHaveProperty('secretToken');
});
