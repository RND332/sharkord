/* eslint-disable react-refresh/only-export-components -- test harness, it exports helpers and not components */
import dialogsEn from '@/i18n/locales/en/dialogs.json';
import * as RealUI from '@sharkord/ui';
import { mock } from 'bun:test';
import i18n from 'i18next';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initReactI18next } from 'react-i18next';

type TInputProps = ComponentProps<typeof RealUI.Input>;
type TButtonProps = ComponentProps<typeof RealUI.Button>;
type TActionProps = ComponentProps<typeof RealUI.AlertDialogAction>;
type TCancelProps = ComponentProps<typeof RealUI.AlertDialogCancel>;

type TTrpcRecords = {
  cleanupCalls: number;
  categoryAdds: { name: string }[];
  joinServerCalls: { handshakeHash: string; password: string }[];
  openDialogCalls: unknown[];
  failNextCategoryAdd: boolean;
};

type TDialogRecords = {
  inputs: TInputProps[];
  buttons: TButtonProps[];
  actions: TActionProps[];
  cancels: TCancelProps[];
  trpc: TTrpcRecords;
};

// Keep a handle on the real primitives before the module is mocked, the spies
// below still have to render the production markup.
const RealInput = RealUI.Input;
const RealButton = RealUI.Button;
const realUi = { ...RealUI };

const records: TDialogRecords = {
  inputs: [],
  buttons: [],
  actions: [],
  cancels: [],
  trpc: {
    cleanupCalls: 0,
    categoryAdds: [],
    joinServerCalls: [],
    openDialogCalls: [],
    failNextCategoryAdd: false
  }
};

const resetRecords = () => {
  records.inputs.length = 0;
  records.buttons.length = 0;
  records.actions.length = 0;
  records.cancels.length = 0;
  records.trpc.cleanupCalls = 0;
  records.trpc.categoryAdds.length = 0;
  records.trpc.joinServerCalls.length = 0;
  records.trpc.openDialogCalls.length = 0;
  records.trpc.failNextCategoryAdd = false;
};

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['dialogs'],
  defaultNS: 'dialogs',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

// Radix renders dialogs through a portal and the server renderer drops it, so
// the shell is swapped for a plain element. The Radix context still comes from
// the real Root, so titles and descriptions keep their real markup.
const PortalFreeShell = ({
  className,
  children
}: {
  className?: string;
  children?: ReactNode;
}) => (
  <div className={className} data-slot="dialog-shell">
    {children}
  </div>
);

const SpyInput = (props: TInputProps) => {
  records.inputs.push(props);

  return <RealInput {...props} />;
};

const SpyButton = (props: TButtonProps) => {
  records.buttons.push(props);

  return <RealButton {...props} />;
};

const SpyAction = (props: TActionProps) => {
  records.actions.push(props);

  // the real action is a Radix button, it is replaced by the plain button so
  // it does not need the content context the portal free shell cannot give
  return <RealButton type="button" {...props} />;
};

const SpyCancel = (props: TCancelProps) => {
  records.cancels.push(props);

  return <RealButton type="button" variant="outline" {...props} />;
};

mock.module('@sharkord/ui', () => ({
  ...realUi,
  DialogContent: PortalFreeShell,
  AlertDialogContent: PortalFreeShell,
  Input: SpyInput,
  Button: SpyButton,
  AlertDialogAction: SpyAction,
  AlertDialogCancel: SpyCancel
}));

// Bun keeps one module registry for a whole test run, so every dialog test
// registers the same trpc stand in. Otherwise the first registered mock wins
// for the following test files and the exports stop matching.
const trpcModule = () => ({
  cleanup: () => {
    records.trpc.cleanupCalls += 1;
  },
  getTRPCClient: () => ({
    categories: {
      add: {
        mutate: async (payload: { name: string }) => {
          if (records.trpc.failNextCategoryAdd) {
            records.trpc.failNextCategoryAdd = false;

            throw new Error('Category name is taken');
          }

          records.trpc.categoryAdds.push(payload);

          return { id: 1, ...payload };
        }
      }
    }
  })
});

const renderDialog = (element: ReactElement) => renderToStaticMarkup(element);

export { records, renderDialog, resetRecords, trpcModule };
