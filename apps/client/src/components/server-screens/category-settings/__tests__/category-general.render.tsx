/* eslint-disable react-refresh/only-export-components -- test harness, it renders the components under test instead of exporting them */
// Renders the category settings editor and prints the markup with the recorded
// calls. The test runs this in its own process: bun keeps the first mock.module
// registration of a path for the whole test run, so the mocks of the other test
// files would leak in.
import settingsEn from '@/i18n/locales/en/settings.json';
import * as sharkordUi from '@sharkord/ui';
import { mock } from 'bun:test';
import i18next from 'i18next';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

globalThis.window =
  globalThis.window ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    location: { href: 'http://localhost' }
  } as unknown as Window & typeof globalThis);

globalThis.document =
  globalThis.document ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    head: { appendChild: noop },
    body: { appendChild: noop },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createTextNode: () => ({}),
    getElementById: () => null,
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

const mode = process.argv[2] ?? 'default';

const category = {
  id: 7,
  name: 'Text channels',
  position: 1,
  createdAt: 0,
  updatedAt: null
};

type TUpdatePayload = {
  categoryId: number;
  name: string;
};

type TToastRecord = {
  type: string;
  message: string;
};

const records = {
  updates: [] as TUpdatePayload[],
  toasts: [] as TToastRecord[]
};

// the real primitives are kept before the module is mocked, the spies below still
// have to render the production markup
const realUi = { ...sharkordUi };
const RealInput = realUi.Input;
const RealButton = realUi.Button;

type TInputProps = ComponentProps<typeof RealInput>;
type TButtonProps = ComponentProps<typeof RealButton>;

const captured = {
  inputs: [] as TInputProps[],
  buttons: [] as TButtonProps[]
};

const SpyInput = (props: TInputProps) => {
  captured.inputs.push(props);

  return <RealInput {...props} />;
};

const SpyButton = (props: TButtonProps) => {
  captured.buttons.push(props);

  return <RealButton {...props} />;
};

mock.module('@sharkord/ui', () => ({
  ...realUi,
  Input: SpyInput,
  Button: SpyButton
}));

mock.module('@/lib/trpc', () => ({
  cleanup: () => {},
  connectToTRPC: () => {},
  getTRPCClient: () => ({
    categories: {
      update: {
        mutate: async (payload: TUpdatePayload) => {
          records.updates.push(payload);

          if (mode === 'fail') {
            throw new Error('Category name is taken');
          }

          return { id: payload.categoryId, name: payload.name };
        }
      }
    }
  })
}));

mock.module('@/features/server/admin/hooks', () => ({
  useAdminCategoryGeneral: () => ({
    category,
    loading: false,
    refetch: async () => undefined
  })
}));

const realSonner = await import('sonner');

mock.module('sonner', () => ({
  ...realSonner,
  toast: {
    success: (message: string) => {
      records.toasts.push({ type: 'success', message });

      return '';
    },
    error: (message: string) => {
      records.toasts.push({ type: 'error', message });

      return '';
    }
  } as unknown as typeof realSonner.toast
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { General } = await import('../general');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <General categoryId={category.id} />
  </I18nextProvider>
);

// the save action of the editor is triggered through the recorded handler
const saveButton = captured.buttons.find((button) => button.onClick);

saveButton?.onClick?.({} as never);

await new Promise((resolve) => setTimeout(resolve, 0));

console.log(`__MARKUP__${html}`);
console.log(`__RECORDS__${JSON.stringify(records)}`);
