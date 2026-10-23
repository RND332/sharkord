import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderOnServer } from '../ssr-render';

describe('the server render', () => {
  test('renders the element without a browser', () => {
    const html = renderOnServer(createElement('div', null, 'hello'));

    expect(html).toContain('hello');
  });
});
