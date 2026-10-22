import dialogsEn from '@/i18n/locales/en/dialogs.json';
import type { TJoinedRole } from '@dodecagon/shared';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const ROLES: TJoinedRole[] = [
  {
    id: 4,
    name: 'Moderator',
    color: '#ffffff',
    isPersistent: true,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: 0,
    updatedAt: 0,
    permissions: []
  },
  {
    id: 5,
    name: 'Guest',
    color: '#ffffff',
    isPersistent: true,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: 0,
    updatedAt: 0,
    permissions: []
  }
];

const copied: string[] = [];

Object.defineProperty(globalThis.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: async (text: string) => {
      copied.push(text);
    }
  }
});

(globalThis as unknown as { window: unknown }).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getComputedStyle: () => ({
    getPropertyValue: () => '',
    paddingLeft: '0',
    paddingRight: '0'
  }),
  location: { host: 'discord.rnd332.com', protocol: 'https:' }
};

(globalThis as unknown as { document: unknown }).document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, removeChild: () => {} },
  documentElement: { clientWidth: 1024, clientHeight: 768, style: {} },
  createElement: () => ({
    setAttribute: () => {},
    style: {},
    appendChild: () => {}
  }),
  createTextNode: () => ({}),
  getElementsByTagName: () => [],
  getElementById: () => null
};

mock.module('@radix-ui/react-portal', () => ({
  Portal: ({ children }: { children: unknown }) => children,
  PortalProvider: ({ children }: { children: unknown }) => children
}));

mock.module('@/features/server/roles/hooks', () => ({
  useRoleById: () => undefined,
  useRoles: () => ROLES
}));

mock.module('@/lib/trpc', () => ({
  cleanup: () => {},
  connectToTRPC: async () => {},
  getTRPCClient: () => ({
    invites: {
      add: {
        mutate: async () => ({
          id: 1,
          code: 'ready-code',
          creatorId: 2,
          roleId: 4,
          maxUses: 10,
          uses: 0,
          expiresAt: Date.now() + 7 * 86_400_000,
          createdAt: Date.now()
        })
      }
    }
  })
}));

mock.module('sonner', () => ({
  Toaster: () => null,
  toast: { success: () => {}, error: () => {} },
  useSonner: () => ({ toast: { success: () => {}, error: () => {} } })
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

const { Dialog, DialogContent } = await import('@dodecagon/ui');
const { CreateInviteDialog, InviteReadyLink } =
  await import('@/components/dialogs/create-invite-dialog');
const { copyInviteLink } =
  await import('@/components/dialogs/create-invite-dialog/helpers');

const withI18n = (children: ReactNode) =>
  createElement(I18nextProvider, { i18n }, children);

const inDialog = (children: ReactNode) =>
  createElement(
    Dialog,
    { open: true },
    createElement(DialogContent, null, children)
  );

const setupMarkup = renderToStaticMarkup(
  withI18n(
    createElement(CreateInviteDialog, {
      isOpen: true,
      close: () => {},
      refetch: () => {}
    })
  )
);

const readyLinkMarkup = renderToStaticMarkup(
  withI18n(
    inDialog(
      createElement(InviteReadyLink, {
        invite: {
          code: 'ready-code',
          roleId: 4,
          maxUses: 10,
          expiresAt: Date.now() + 7 * 86_400_000
        }
      })
    )
  )
);

const defaultReadyLinkMarkup = renderToStaticMarkup(
  withI18n(
    inDialog(
      createElement(InviteReadyLink, {
        invite: {
          code: 'plain-code',
          roleId: null,
          maxUses: null,
          expiresAt: null
        }
      })
    )
  )
);

await copyInviteLink('https://discord.rnd332.com/?invite=ready-code');

console.log(
  `__RESULT__${JSON.stringify({
    setupMarkup,
    readyLinkMarkup,
    defaultReadyLinkMarkup,
    copied
  })}`
);
