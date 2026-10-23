import { Select as SelectPrimitive } from '@base-ui/react/select';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import * as React from 'react';

import { cn } from '../lib/utils';

type TSelectProps = Omit<
  React.ComponentProps<typeof SelectPrimitive.Root>,
  'onValueChange' | 'onOpenChange'
> & {
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
};

// the base ui select only knows the label of the selected item through the
// items of the root, so the labels of the rendered items are collected here
const collectItems = (
  children: React.ReactNode
): Record<string, React.ReactNode> => {
  const items: Record<string, React.ReactNode> = {};

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const element = child as React.ReactElement<{
        value?: unknown;
        children?: React.ReactNode;
      }>;

      if (element.type === SelectItem) {
        if (typeof element.props.value === 'string') {
          items[element.props.value] = element.props.children;
        }

        return;
      }

      visit(element.props.children);
    });
  };

  visit(children);

  return items;
};

const SelectItemsContext = React.createContext<Record<
  string,
  React.ReactNode
> | null>(null);

function Select({
  onValueChange,
  onOpenChange,
  children,
  items,
  ...props
}: TSelectProps) {
  const contentItems = React.useMemo(() => collectItems(children), [children]);
  const resolvedItems = (items ?? contentItems) as Record<
    string,
    React.ReactNode
  >;

  return (
    <SelectItemsContext.Provider value={resolvedItems}>
      <SelectPrimitive.Root
        data-slot="select"
        items={resolvedItems}
        {...props}
        onValueChange={(value) => onValueChange?.(value as string)}
        onOpenChange={(open) => onOpenChange?.(open)}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectItemsContext.Provider>
  );
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  placeholder,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  const items = React.useContext(SelectItemsContext);

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      {...props}
    >
      {(value: unknown) => {
        if (typeof children === 'function') {
          return children(value);
        }

        if (value === undefined || value === null || value === '') {
          return placeholder ?? children ?? null;
        }

        // the radix value node only held the text of the matching item, a
        // value without an item stayed empty
        const label = typeof value === 'string' ? items?.[value] : undefined;

        return label ?? children ?? null;
      }}
    </SelectPrimitive.Value>
  );
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-input-surface px-3 text-sm outline-none transition-[border-color,box-shadow] data-[placeholder]:text-muted-foreground hover:bg-panel focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        size === 'sm' ? 'h-9 py-1.5' : 'h-11 py-2',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon className="size-4 opacity-50" />}
      />
    </SelectPrimitive.Trigger>
  );
}

type TSelectPositionerProps = React.ComponentProps<
  typeof SelectPrimitive.Positioner
>;

type TSelectContentProps = React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<
    TSelectPositionerProps,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  > & {
    position?: 'item-aligned' | 'popper';
  };

function SelectContent({
  className,
  children,
  position = 'popper',
  side = 'bottom',
  align = 'center',
  sideOffset,
  alignOffset,
  collisionPadding,
  ...props
}: TSelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="z-50"
        alignItemWithTrigger={position === 'item-aligned'}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'relative max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-[7px] border border-line bg-nav text-popover-foreground shadow-xl data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95',
            position === 'popper' &&
              'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List
            className={cn(
              'p-1',
              position === 'popper' &&
                'h-[var(--anchor-height)] w-full min-w-[var(--anchor-width)] scroll-my-1'
            )}
          >
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
};
