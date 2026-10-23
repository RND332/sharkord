import { expect, test } from 'bun:test';
import i18next from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { VoiceGrid } from '../voice-grid';

const i18n = i18next.createInstance();

await i18n.init({ lng: 'en', fallbackLng: 'en', resources: {} });

const cards = ['share', 'one', 'two'].map((id) =>
  createElement('div', { key: id, 'data-card': id }, id)
);

const renderPinnedGrid = () =>
  renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <VoiceGrid pinnedCardId="share" tileAspectRatio={16 / 9}>
        {cards}
      </VoiceGrid>
    </I18nextProvider>
  );

const renderGrid = () =>
  renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <VoiceGrid tileAspectRatio={16 / 9}>{cards}</VoiceGrid>
    </I18nextProvider>
  );

test('the participant thumbnails keep the 16:9 shape of the stage tiles', () => {
  const html = renderPinnedGrid();

  // the thumbnail declares the video shape, so it stays 16:9 in every width
  expect(html).toContain('aspect-video');
  expect(html).toContain('w-40');

  // the strip keeps the height of a 160x90 thumbnail
  expect(html).toContain('h-[90px]');

  // the old 4:3 thumbnail box is gone
  expect(html).not.toContain('w-38');
  expect(html).not.toContain('h-[114px]');
});

test('the stage keeps a top band for the chat button', () => {
  // the button floats at the top of the stage, so the tiles start below it
  expect(renderPinnedGrid()).toContain('pt-12');
  expect(renderGrid()).toContain('pt-12');
});
