import { SHORTCUTS } from '@/components/hotkeys-controller/shortcuts';
import { useOnEsc } from '@/hooks/use-on-esc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@dodecagon/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

const KEY_LABELS: Record<string, string> = {
  Comma: ',',
  Slash: '/',
  ArrowUp: '↑',
  ArrowDown: '↓'
};

const KeyboardShortcutsDialog = memo(({ isOpen, close }: TDialogBaseProps) => {
  const { t } = useTranslation(['dialogs', 'sidebar', 'topbar']);
  useOnEsc(close);
  const isMac = navigator.platform.includes('Mac');

  return (
    <Dialog open={isOpen}>
      <DialogContent
        close={close}
        onInteractOutside={close}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t('keyboardShortcutsTitle')}</DialogTitle>
          <DialogDescription>
            {t('keyboardShortcutsDescription')}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2">
          {SHORTCUTS.map((shortcut) => {
            const modifiers = shortcut.modifiers.map((modifier) => {
              if (modifier === 'Mod') return isMac ? '⌘' : 'Ctrl';
              if (modifier === 'Alt' && isMac) return '⌥';
              return modifier;
            });
            const key =
              KEY_LABELS[shortcut.code] ?? shortcut.code.replace('Key', '');
            const keys = [...modifiers, key];

            return (
              <div
                key={shortcut.code}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2"
              >
                <dt className="text-sm">{t(shortcut.label)}</dt>
                <dd className="flex items-center gap-1">
                  {keys.map((label) => (
                    <kbd
                      key={label}
                      className="rounded border border-line bg-background px-2 py-1 text-xs font-medium"
                    >
                      {label}
                    </kbd>
                  ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </DialogContent>
    </Dialog>
  );
});

export { KeyboardShortcutsDialog };
