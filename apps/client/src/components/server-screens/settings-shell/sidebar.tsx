import { cn } from '@/lib/utils';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { TestId } from '@sharkord/shared';
import { Separator, Tooltip } from '@sharkord/ui';

import { memo, useCallback } from 'react';
import type { TSettingsEntry } from './types';

type TSidebarEntryProps = {
  entry: TSettingsEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const SidebarEntry = memo(
  ({ entry, isSelected, onSelect }: TSidebarEntryProps) => {
    const { icon: Icon, logo, label, error } = entry;

    const handleClick = useCallback(
      () => onSelect(entry.id),
      [onSelect, entry.id]
    );

    return (
      <button
        data-testid={TestId.SETTINGS_SIDEBAR_ENTRY}
        onClick={handleClick}
        className={cn(
          'flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected && 'bg-raised font-medium text-foreground'
        )}
      >
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-[17px] w-[17px] shrink-0 rounded-sm object-cover"
          />
        ) : (
          <Icon className="h-[17px] w-[17px] shrink-0" />
        )}
        <span className="truncate">{label}</span>
        {error && (
          <Tooltip content={error}>
            <ExclamationCircleIcon
              role="img"
              aria-label={error}
              className="ml-auto h-4 w-4 shrink-0 text-destructive"
            />
          </Tooltip>
        )}
      </button>
    );
  }
);

type TSettingsSidebarProps = {
  entries: TSettingsEntry[];
  pluginEntries: TSettingsEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  groupLabel?: string;
  className?: string;
};

const SettingsSidebar = memo(
  ({
    entries,
    pluginEntries,
    selectedId,
    onSelect,
    groupLabel,
    className
  }: TSettingsSidebarProps) => {
    return (
      <nav
        className={cn(
          'w-[252px] shrink-0 space-y-1 overflow-y-auto border-r border-line bg-nav px-3 py-6',
          className
        )}
      >
        {groupLabel && (
          <div className="flex h-[30px] items-center px-[11px] text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle-foreground">
            {groupLabel}
          </div>
        )}
        {entries.map((entry) => (
          <SidebarEntry
            key={entry.id}
            entry={entry}
            isSelected={entry.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        {pluginEntries.length > 0 && (
          <>
            <Separator className="my-3" />
            {pluginEntries.map((entry) => (
              <SidebarEntry
                key={entry.id}
                entry={entry}
                isSelected={entry.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </>
        )}
      </nav>
    );
  }
);

export { SettingsSidebar };
