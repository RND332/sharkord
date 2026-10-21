import { useModViewOpen } from '@/features/app/hooks';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { usePreventExit } from '@/hooks/use-prevent-exit';
import { cn } from '@/lib/utils';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { IconButton } from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsFormContext, type TSettingsFormHandle } from './context';
import { SaveBar } from './save-bar';
import { SettingsSidebar } from './sidebar';
import type { TSettingsEntry } from './types';

type TSettingsShellProps = {
  title: string;
  close: () => void;
  entries: TSettingsEntry[];
  pluginEntries?: TSettingsEntry[];
  initialEntryId?: string;
  groupLabel?: string;
};

const NO_ENTRIES: TSettingsEntry[] = [];

const SettingsShell = memo(
  ({
    title,
    close,
    entries,
    pluginEntries = NO_ENTRIES,
    initialEntryId,
    groupLabel
  }: TSettingsShellProps) => {
    const { t } = useTranslation('settings');
    const [selectedId, setSelectedId] = useState(
      () => initialEntryId ?? entries[0]?.id ?? ''
    );
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [form, setForm] = useState<TSettingsFormHandle | null>(null);
    const { isOpen: isModViewOpen } = useModViewOpen();
    const { isOpen: isDialogOpen } = useDialogInfo();

    usePreventExit(form?.isDirty);

    const allEntries = useMemo(
      () => [...entries, ...pluginEntries],
      [entries, pluginEntries]
    );

    const selectedEntry =
      allEntries.find((entry) => entry.id === selectedId) ?? allEntries[0];

    const confirmLeave = useCallback(async () => {
      if (!form?.isDirty) return true;

      return requestConfirmation({
        title: t('discardChangesTitle'),
        message: t('discardChangesMsg'),
        confirmLabel: t('discardChangesBtn'),
        variant: 'danger'
      });
    }, [form?.isDirty, t]);

    const handleClose = useCallback(async () => {
      if (await confirmLeave()) close();
    }, [confirmLeave, close]);

    const handleSelect = useCallback(
      async (id: string) => {
        if (id === selectedId) {
          setIsDrawerOpen(false);
          return;
        }

        if (!(await confirmLeave())) return;

        setForm(null);
        setSelectedId(id);
        setIsDrawerOpen(false);
      },
      [confirmLeave, selectedId]
    );

    const toggleDrawer = useCallback(
      () => setIsDrawerOpen((open) => !open),
      []
    );
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;

        // the topmost surface owns escape: a dialog or the mod view closes itself first
        if (isModViewOpen || isDialogOpen) return;

        handleClose();
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleClose, isModViewOpen, isDialogOpen]);

    return (
      <SettingsFormContext.Provider value={setForm}>
        <div className="flex h-dvh flex-col bg-canvas text-foreground">
          <div className="relative flex min-h-0 flex-1">
            {isDrawerOpen && (
              <div
                className="absolute inset-0 z-30 bg-black/50 md:hidden"
                onClick={closeDrawer}
              />
            )}

            <SettingsSidebar
              entries={entries}
              pluginEntries={pluginEntries}
              selectedId={selectedEntry?.id ?? ''}
              onSelect={handleSelect}
              groupLabel={groupLabel}
              navigationLabel={t('settingsNavigationLabel')}
              className={cn(
                'absolute inset-y-0 left-0 z-40 invisible transition-transform duration-300 ease-in-out md:visible md:relative md:z-0 md:translate-x-0',
                isDrawerOpen
                  ? 'translate-x-0 visible'
                  : '-translate-x-full invisible'
              )}
            />

            <main className="relative flex-1 overflow-y-auto bg-canvas">
              <div className="pointer-events-none sticky top-0 z-50 h-0">
                <div className="relative mx-auto w-full max-w-[1188px]">
                  <div className="absolute top-0 right-5 left-5 flex items-center justify-between md:right-8 md:left-8 md:justify-end">
                    <IconButton
                      icon={Bars3Icon}
                      variant="ghost"
                      aria-label={t('settingsNavigationLabel')}
                      aria-controls="settings-sidebar"
                      aria-expanded={isDrawerOpen}
                      onClick={toggleDrawer}
                      className="pointer-events-auto md:hidden"
                    />
                    <IconButton
                      icon={XMarkIcon}
                      variant="ghost"
                      aria-label={t('close')}
                      onClick={handleClose}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[1188px] p-5 pt-8 md:p-8 md:pt-8 lg:px-[60px]">
                <h1 className="sr-only">{title}</h1>
                {selectedEntry?.content}
              </div>

              {form?.isDirty && (
                <SaveBar isSaving={form.isSaving} save={form.save} />
              )}
            </main>
          </div>
        </div>
      </SettingsFormContext.Provider>
    );
  }
);

export { SettingsShell };
