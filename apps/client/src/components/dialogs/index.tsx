import { closeDialogs } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { memoizeImport, warmImportsWhenIdle } from '@/helpers/prefetch';
import { createElement, lazy, memo, Suspense, type ComponentType } from 'react';
import { Dialog } from './dialogs';

const loadConfirmAction = memoizeImport(() => import('./confirm-action'));
const loadCreateChannel = memoizeImport(() => import('./create-channel'));
const loadTextInput = memoizeImport(() => import('./text-input'));
const loadServerPassword = memoizeImport(() => import('./server-password'));
const loadSounds = memoizeImport(() => import('./sounds'));
const loadAssignRole = memoizeImport(() => import('./assign-role'));
const loadCreateInvite = memoizeImport(() => import('./create-invite-dialog'));
const loadCreateCategory = memoizeImport(() => import('./create-category'));
const loadPluginInstallConfirm = memoizeImport(
  () => import('./plugin-install-confirm')
);
const loadDeleteUser = memoizeImport(() => import('./delete-user'));
const loadSearch = memoizeImport(() => import('./search'));
const loadWelcomeProfileSetup = memoizeImport(
  () => import('./welcome-profile-setup')
);
const loadVoiceDebug = memoizeImport(() => import('./voice-debug'));

const ConfirmActionDialog = lazy(() =>
  loadConfirmAction().then((m) => ({ default: m.ConfirmActionDialog }))
);
const CreateChannelDialog = lazy(() =>
  loadCreateChannel().then((m) => ({ default: m.CreateChannelDialog }))
);
const TextInputDialog = lazy(() =>
  loadTextInput().then((m) => ({ default: m.TextInputDialog }))
);
const ServerPasswordDialog = lazy(() =>
  loadServerPassword().then((m) => ({ default: m.ServerPasswordDialog }))
);
const SoundsDialog = lazy(() =>
  loadSounds().then((m) => ({ default: m.SoundsDialog }))
);
const AssignRoleDialog = lazy(() =>
  loadAssignRole().then((m) => ({ default: m.AssignRoleDialog }))
);
const CreateInviteDialog = lazy(() =>
  loadCreateInvite().then((m) => ({ default: m.CreateInviteDialog }))
);
const CreateCategoryDialog = lazy(() =>
  loadCreateCategory().then((m) => ({ default: m.CreateCategoryDialog }))
);
const PluginInstallConfirmDialog = lazy(() =>
  loadPluginInstallConfirm().then((m) => ({
    default: m.PluginInstallConfirmDialog
  }))
);
const DeleteUserDialog = lazy(() =>
  loadDeleteUser().then((m) => ({ default: m.DeleteUserDialog }))
);
const SearchDialog = lazy(() =>
  loadSearch().then((m) => ({ default: m.SearchDialog }))
);
const WelcomeProfileSetupDialog = lazy(() =>
  loadWelcomeProfileSetup().then((m) => ({
    default: m.WelcomeProfileSetupDialog
  }))
);
const VoiceDebugDialog = lazy(() =>
  loadVoiceDebug().then((m) => ({ default: m.VoiceDebugDialog }))
);

const DialogsMap = {
  [Dialog.CONFIRM_ACTION]: ConfirmActionDialog,
  [Dialog.CREATE_CHANNEL]: CreateChannelDialog,
  [Dialog.TEXT_INPUT]: TextInputDialog,
  [Dialog.SERVER_PASSWORD]: ServerPasswordDialog,
  [Dialog.SOUNDS]: SoundsDialog,
  [Dialog.ASSIGN_ROLE]: AssignRoleDialog,
  [Dialog.CREATE_INVITE]: CreateInviteDialog,
  [Dialog.CREATE_CATEGORY]: CreateCategoryDialog,
  [Dialog.PLUGIN_INSTALL_CONFIRM]: PluginInstallConfirmDialog,
  [Dialog.DELETE_USER]: DeleteUserDialog,
  [Dialog.SEARCH]: SearchDialog,
  [Dialog.WELCOME_PROFILE_SETUP]: WelcomeProfileSetupDialog,
  [Dialog.VOICE_DEBUG]: VoiceDebugDialog
};

warmImportsWhenIdle([
  loadConfirmAction,
  loadCreateChannel,
  loadTextInput,
  loadServerPassword,
  loadSounds,
  loadAssignRole,
  loadCreateInvite,
  loadCreateCategory,
  loadPluginInstallConfirm,
  loadDeleteUser,
  loadSearch,
  loadWelcomeProfileSetup,
  loadVoiceDebug
]);

const DialogsProvider = memo(() => {
  const { isOpen, openDialog, props, closing } = useDialogInfo();
  if (!openDialog || !DialogsMap[openDialog]) return null;

  const DialogComponent = DialogsMap[openDialog];
  return (
    <Suspense fallback={null}>
      {createElement(
        DialogComponent as unknown as ComponentType<Record<string, unknown>>,
        {
          ...props,
          isOpen: isOpen && !closing,
          close: closeDialogs
        }
      )}
    </Suspense>
  );
});

export { DialogsProvider };
