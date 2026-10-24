import { describe, expect, test } from 'bun:test';
import {
  createI18n,
  detectLanguageFromHeader,
  getLanguageResources,
  whenI18nReady
} from '../index';

describe('the i18n factory', () => {
  test('creates an instance for the given language', async () => {
    const instance = createI18n('ru');

    await instance.init();

    expect(instance.language).toBe('ru');
  });

  test('keeps two instances apart', async () => {
    const first = createI18n('en');
    const second = createI18n('es');

    await Promise.all([first.init(), second.init()]);

    expect(first.language).toBe('en');
    expect(second.language).toBe('es');
  });

  test('takes the language of a request from its header', () => {
    expect(detectLanguageFromHeader('ru-RU,ru;q=0.9,en;q=0.8')).toBe('ru');
    expect(detectLanguageFromHeader('de-DE,de;q=0.9')).toBe('en');
    expect(detectLanguageFromHeader(null)).toBe('en');
  });

  test('loads the language of the user when the resources carry another one', async () => {
    const server = createI18n('ru');

    await whenI18nReady(server);

    const resources = getLanguageResources(server, 'ru');
    const browser = createI18n('ru', resources);

    expect(browser.t('identityLabel', { ns: 'connect' })).toBe('Логин');

    await browser.changeLanguage('en');

    expect(browser.language).toBe('en');
    expect(browser.t('identityLabel', { ns: 'connect' })).toBe('Identity');
  });
});
