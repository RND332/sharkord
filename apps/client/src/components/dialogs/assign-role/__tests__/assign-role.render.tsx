import dialogsEn from '@/i18n/locales/en/dialogs.json';
import permissionsEn from '@/i18n/locales/en/permissions.json';
import {
  Permission,
  type TJoinedRole,
  type TJoinedUser
} from '@sharkord/shared';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const buildRole = (id: number, name: string, permissions: Permission[] = []) =>
  ({
    id,
    name,
    color: '#ffffff',
    isPersistent: true,
    isDefault: false,
    storageQuotaOverrideEnabled: false,
    storageSpaceQuota: 0,
    createdAt: 0,
    updatedAt: 0,
    permissions
  }) satisfies TJoinedRole;

const ROLES: TJoinedRole[] = [
  buildRole(4, 'Moderator', [Permission.SEND_MESSAGES]),
  buildRole(5, 'Guest'),
  buildRole(6, 'Support')
];

const LONG_ROLE_NAME =
  'Community support specialist with a deliberately very long role name';

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

mock.module('@/features/server/users/hooks', () => ({
  useUsers: () => [],
  useOwnUserId: () => 2,
  useOwnUserPasswordSet: () => true,
  useIsOwnUser: () => false,
  useUserById: () => undefined,
  useOwnPublicUser: () => undefined,
  useUserStatus: () => 'online',
  useUsernames: () => [],
  useFilteredUsers: () => [],
  useOwnUserRoleIds: () => [],
  useOwnUserHasRole: () => false
}));

mock.module('@/lib/trpc', () => ({
  cleanup: () => {},
  connectToTRPC: async () => {},
  getTRPCClient: () => ({
    users: { addRole: { mutate: async () => ({}) } }
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
  resources: {
    en: { dialogs: dialogsEn, permissions: permissionsEn }
  },
  interpolation: { escapeValue: false }
});

const { AssignRoleDialog, RoleAssignment } =
  await import('@/components/dialogs/assign-role');

const withI18n = (children: ReactNode) =>
  createElement(I18nextProvider, { i18n }, children);

const buildUser = (roleIds: number[]) =>
  ({
    id: 7,
    name: 'aria',
    roleIds
  }) as unknown as TJoinedUser;

const dialogMarkup = renderToStaticMarkup(
  withI18n(
    createElement(AssignRoleDialog, {
      isOpen: true,
      close: () => {},
      user: buildUser([5]),
      refetch: async () => {}
    })
  )
);

const selectedMarkup = renderToStaticMarkup(
  withI18n(
    createElement(RoleAssignment, {
      label: 'Role for aria',
      roles: [ROLES[0], ROLES[1]],
      selectedRoleId: 4,
      onSelect: () => {}
    })
  )
);

const longNameMarkup = renderToStaticMarkup(
  withI18n(
    createElement(RoleAssignment, {
      label: 'Role for aria',
      roles: [buildRole(9, LONG_ROLE_NAME)],
      selectedRoleId: 9,
      onSelect: () => {}
    })
  )
);

const emptyMarkup = renderToStaticMarkup(
  withI18n(
    createElement(AssignRoleDialog, {
      isOpen: true,
      close: () => {},
      user: buildUser([4, 5, 6]),
      refetch: async () => {}
    })
  )
);

console.log(
  `__RESULT__${JSON.stringify({
    dialogMarkup,
    selectedMarkup,
    longNameMarkup,
    emptyMarkup
  })}`
);
