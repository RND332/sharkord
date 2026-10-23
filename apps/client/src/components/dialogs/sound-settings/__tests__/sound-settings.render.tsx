// Renders the sound settings dialog and prints the markup. The test runs this
// in its own process: bun keeps the first mock.module registration of a path for
// the whole test run, so the mocks of the other test files would leak in.
import dialogsEn from '@/i18n/locales/en/dialogs.json';
import { renderInDom } from '@/test-utils/dom-render';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

// the enabled choices are passed in as a comma separated list
const enabled = new Set((process.argv[2] ?? '').split(',').filter(Boolean));

const saved: { joinLeave?: boolean; muteDeafen?: boolean } = {};

mock.module('@/features/app/hooks', () => ({
  useJoinLeaveSounds: () => enabled.has('joinLeave'),
  useMuteDeafenSounds: () => enabled.has('muteDeafen')
}));

mock.module('@/features/app/actions', () => ({
  setJoinLeaveSounds: (value: boolean) => {
    saved.joinLeave = value;
  },
  setMuteDeafenSounds: (value: boolean) => {
    saved.muteDeafen = value;
  }
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

const { SoundSettingsDialog } = await import('../index');

const html = await renderInDom(
  <I18nextProvider i18n={i18n}>
    <SoundSettingsDialog isOpen close={noop} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
console.log(`__SAVED__${JSON.stringify(saved)}`);
