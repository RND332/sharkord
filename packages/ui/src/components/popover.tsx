import type { PopoverRoot } from '@base-ui/react/popover';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import * as React from 'react';

import { cn } from '../lib/utils';

type TPopoverAnchor =
  | Element
  | {
      getBoundingClientRect: () => ClientRect;
    };

type TPopoverEventHandlers = {
  onInteractOutside?: (event: Event) => void;
  onFocusOutside?: (event: Event) => void;
};

type TPopoverContextValue = {
  anchor: TPopoverAnchor | null;
  setAnchor: (anchor: TPopoverAnchor | null) => void;
  eventHandlers: React.RefObject<TPopoverEventHandlers>;
};

const PopoverContext = React.createContext<TPopoverContextValue | null>(null);

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.RefObject<T | null>).current = node;
      }
    }
  };
}

type TPopoverProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Root>,
  'onOpenChange'
> & {
  onOpenChange?: (open: boolean) => void;
};

function Popover({ onOpenChange, ...props }: TPopoverProps) {
  const [anchor, setAnchor] = React.useState<TPopoverAnchor | null>(null);
  const eventHandlers = React.useRef<TPopoverEventHandlers>({});

  const handleOpenChange = React.useCallback(
    (open: boolean, details: PopoverRoot.ChangeEventDetails) => {
      if (!open) {
        const handler =
          details.reason === 'outside-press'
            ? eventHandlers.current.onInteractOutside
            : details.reason === 'focus-out'
              ? eventHandlers.current.onFocusOutside
              : undefined;

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

  const contextValue = React.useMemo<TPopoverContextValue>(
    () => ({ anchor, setAnchor, eventHandlers }),
    [anchor]
  );

  return (
    <PopoverContext.Provider value={contextValue}>
      <PopoverPrimitive.Root
        data-slot="popover"
        {...props}
        onOpenChange={handleOpenChange}
      />
    </PopoverContext.Provider>
  );
}

type TPopoverTriggerProps = React.ComponentProps<
  typeof PopoverPrimitive.Trigger
> & {
  asChild?: boolean;
};

function PopoverTrigger({ asChild, children, ...props }: TPopoverTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <PopoverPrimitive.Trigger
        data-slot="popover-trigger"
        render={children}
        {...props}
      />
    );
  }

  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  );
}

type TPopoverPositionerProps = React.ComponentProps<
  typeof PopoverPrimitive.Positioner
>;

type TPopoverContentProps = React.ComponentProps<
  typeof PopoverPrimitive.Popup
> &
  Pick<
    TPopoverPositionerProps,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  > & {
    onInteractOutside?: (event: Event) => void;
    onFocusOutside?: (event: Event) => void;
    onCloseAutoFocus?: (event: Event) => void;
  };

function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  onInteractOutside,
  onFocusOutside,
  onCloseAutoFocus,
  children,
  ...props
}: TPopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const eventHandlers = context?.eventHandlers;

  React.useEffect(() => {
    if (!eventHandlers) {
      return;
    }

    eventHandlers.current = { onInteractOutside, onFocusOutside };

    return () => {
      eventHandlers.current = {};
    };
  }, [eventHandlers, onInteractOutside, onFocusOutside]);

  const finalFocus = onCloseAutoFocus
    ? () => {
        const event = new Event('closeAutoFocus', { cancelable: true });
        onCloseAutoFocus(event);

        return event.defaultPrevented ? false : true;
      }
    : undefined;

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        anchor={context?.anchor as unknown as TPopoverPositionerProps['anchor']}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          finalFocus={finalFocus}
          className={cn(
            'bg-popover text-popover-foreground data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--transform-origin) rounded-md border p-4 shadow-md outline-hidden',
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

type TPopoverAnchorProps = React.ComponentPropsWithoutRef<'div'> & {
  asChild?: boolean;
  virtualRef?: React.RefObject<{
    getBoundingClientRect: () => ClientRect;
  }>;
};

function PopoverAnchor({
  asChild,
  virtualRef,
  children,
  ...props
}: TPopoverAnchorProps) {
  const context = React.useContext(PopoverContext);
  const setAnchor = context?.setAnchor;

  React.useEffect(() => {
    if (!virtualRef) {
      return;
    }

    setAnchor?.(virtualRef.current);
  }, [setAnchor, virtualRef]);

  const setElement = React.useCallback(
    (node: HTMLElement | null) => {
      if (virtualRef) {
        return;
      }

      setAnchor?.(node);
    },
    [setAnchor, virtualRef]
  );

  if (virtualRef) {
    return null;
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;

    return React.cloneElement(child, {
      'data-slot': 'popover-anchor',
      ...props,
      ref: composeRefs(
        child.props.ref as React.Ref<HTMLElement> | undefined,
        setElement
      )
    });
  }

  return (
    <div data-slot="popover-anchor" ref={setElement} {...props}>
      {children}
    </div>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
