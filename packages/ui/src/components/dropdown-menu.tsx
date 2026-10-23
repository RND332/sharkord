import type { MenuRoot } from '@base-ui/react/menu';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import * as React from 'react';

import { cn } from '../lib/utils';

type TMenuEventHandlers = {
  onEscapeKeyDown?: (event: Event) => void;
};

type TMenuContextValue = {
  eventHandlers: React.RefObject<TMenuEventHandlers>;
};

const MenuContext = React.createContext<TMenuContextValue | null>(null);

type TDropdownMenuProps = Omit<
  React.ComponentProps<typeof MenuPrimitive.Root>,
  'onOpenChange'
> & {
  onOpenChange?: (open: boolean) => void;
};

function DropdownMenu({ onOpenChange, ...props }: TDropdownMenuProps) {
  const eventHandlers = React.useRef<TMenuEventHandlers>({});

  const handleOpenChange = React.useCallback(
    (open: boolean, details: MenuRoot.ChangeEventDetails) => {
      if (!open && details.reason === 'escape-key') {
        const handler = eventHandlers.current.onEscapeKeyDown;

        if (handler) {
          handler(details.event);

          if (details.event.defaultPrevented) {
            details.cancel();
            return;
          }
        }
      }

      onOpenChange?.(open);
    },
    [onOpenChange]
  );

  const contextValue = React.useMemo<TMenuContextValue>(
    () => ({ eventHandlers }),
    [eventHandlers]
  );

  return (
    <MenuContext.Provider value={contextValue}>
      <MenuPrimitive.Root
        data-slot="dropdown-menu"
        {...props}
        onOpenChange={handleOpenChange}
      />
    </MenuContext.Provider>
  );
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Portal>) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

type TDropdownMenuTriggerProps = React.ComponentProps<
  typeof MenuPrimitive.Trigger
> & {
  asChild?: boolean;
};

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: TDropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <MenuPrimitive.Trigger
        data-slot="dropdown-menu-trigger"
        render={children}
        {...props}
      />
    );
  }

  return (
    <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props}>
      {children}
    </MenuPrimitive.Trigger>
  );
}

type TMenuPositionerProps = React.ComponentProps<
  typeof MenuPrimitive.Positioner
>;

type TDropdownMenuContentProps = React.ComponentProps<
  typeof MenuPrimitive.Popup
> &
  Pick<
    TMenuPositionerProps,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  > & {
    onEscapeKeyDown?: (event: Event) => void;
  };

function DropdownMenuContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  onEscapeKeyDown,
  ...props
}: TDropdownMenuContentProps) {
  const context = React.useContext(MenuContext);
  const eventHandlers = context?.eventHandlers;

  React.useEffect(() => {
    if (!eventHandlers) {
      return;
    }

    eventHandlers.current = { onEscapeKeyDown };

    return () => {
      eventHandlers.current = {};
    };
  }, [eventHandlers, onEscapeKeyDown]);

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            'bg-popover text-popover-foreground data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Group>) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

type TDropdownMenuItemProps = Omit<
  React.ComponentProps<typeof MenuPrimitive.Item>,
  'onSelect'
> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
  onSelect?: (event: Event) => void;
};

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  onSelect,
  onClick,
  ...props
}: TDropdownMenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={(event) => {
        onClick?.(event);

        if (onSelect) {
          const selectEvent = new Event('select', { cancelable: true });
          onSelect(selectEvent);

          if (selectEvent.defaultPrevented) {
            event.preventBaseUIHandler();
          }
        }
      }}
      {...props}
    />
  );
}

type TDropdownMenuCheckboxItemProps = Omit<
  React.ComponentProps<typeof MenuPrimitive.CheckboxItem>,
  'onSelect'
> & {
  onSelect?: (event: Event) => void;
};

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onSelect,
  onClick,
  ...props
}: TDropdownMenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      onClick={(event) => {
        onClick?.(event);

        if (onSelect) {
          const selectEvent = new Event('select', { cancelable: true });
          onSelect(selectEvent);

          if (selectEvent.defaultPrevented) {
            event.preventBaseUIHandler();
          }
        }
      }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon className="size-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioGroup>) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

type TDropdownMenuRadioItemProps = Omit<
  React.ComponentProps<typeof MenuPrimitive.RadioItem>,
  'onSelect'
> & {
  onSelect?: (event: Event) => void;
};

function DropdownMenuRadioItem({
  className,
  children,
  onSelect,
  onClick,
  ...props
}: TDropdownMenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={(event) => {
        onClick?.(event);

        if (onSelect) {
          const selectEvent = new Event('select', { cancelable: true });
          onSelect(selectEvent);

          if (selectEvent.defaultPrevented) {
            event.preventBaseUIHandler();
          }
        }
      }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <span className="size-2 rounded-full bg-current" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

type TDropdownMenuSubContentProps = React.ComponentProps<
  typeof MenuPrimitive.Popup
> &
  Pick<
    TMenuPositionerProps,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  >;

function DropdownMenuSubContent({
  className,
  side = 'right',
  align = 'start',
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  ...props
}: TDropdownMenuSubContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-sub-content"
          className={cn(
            'bg-popover text-popover-foreground data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
};
