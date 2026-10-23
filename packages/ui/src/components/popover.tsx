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
  setElementAnchor: (anchor: TPopoverAnchor | null) => void;
  setVirtualAnchor: (anchor: TPopoverAnchor | null) => void;
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
  const [elementAnchor, setElementAnchor] = React.useState<TPopoverAnchor | null>(
    null
  );
  const [virtualAnchor, setVirtualAnchor] = React.useState<TPopoverAnchor | null>(
    null
  );
  const eventHandlers = React.useRef<TPopoverEventHandlers>({});

  // the virtual anchor wins over the element one, the app registers it to
  // place the popup next to a region the dom does not own
  const anchor = virtualAnchor ?? elementAnchor;

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
    () => ({ anchor, setElementAnchor, setVirtualAnchor, eventHandlers }),
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
        className="z-50"
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
            'bg-popover text-popover-foreground data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-72 origin-(--transform-origin) rounded-md border p-4 shadow-md outline-hidden',
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
  const setElementAnchor = context?.setElementAnchor;
  const setVirtualAnchor = context?.setVirtualAnchor;

  React.useEffect(() => {
    if (!virtualRef) {
      return;
    }

    setVirtualAnchor?.(virtualRef.current);
  }, [setVirtualAnchor, virtualRef]);

  const setElement = React.useCallback(
    (node: HTMLElement | null) => {
      if (virtualRef) {
        return;
      }

      setElementAnchor?.(node);
    },
    [setElementAnchor, virtualRef]
  );

  const child = asChild && React.isValidElement(children)
    ? (children as React.ReactElement<Record<string, unknown>>)
    : null;

  // the composed ref keeps its identity, so the anchor is not detached and
  // attached again on every render
  const anchorRef = React.useMemo(
    () =>
      composeRefs(
        child?.props.ref as React.Ref<HTMLElement> | undefined,
        setElement
      ),
    [child?.props.ref, setElement]
  );

  if (virtualRef) {
    return null;
  }

  if (child) {
    return React.cloneElement(child, {
      'data-slot': 'popover-anchor',
      ...props,
      ref: anchorRef
    });
  }

  return (
    <div data-slot="popover-anchor" ref={setElement} {...props}>
      {children}
    </div>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
