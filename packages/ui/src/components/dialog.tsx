import type { DialogRoot } from '@base-ui/react/dialog';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as React from 'react';

import { cn } from '../lib/utils';

type TDialogEventHandlers = {
  onInteractOutside?: (event: Event) => void;
};

type TDialogContextValue = {
  eventHandlers: React.RefObject<TDialogEventHandlers>;
};

const DialogContext = React.createContext<TDialogContextValue | null>(null);

type TDialogProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Root>,
  'onOpenChange'
> & {
  onOpenChange?: (open: boolean) => void;
};

function Dialog({ onOpenChange, ...props }: TDialogProps) {
  const eventHandlers = React.useRef<TDialogEventHandlers>({});

  const handleOpenChange = React.useCallback(
    (open: boolean, details: DialogRoot.ChangeEventDetails) => {
      if (!open && details.reason === 'outside-press') {
        const handler = eventHandlers.current.onInteractOutside;

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

  const contextValue = React.useMemo<TDialogContextValue>(
    () => ({ eventHandlers }),
    [eventHandlers]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPrimitive.Root
        data-slot="dialog"
        {...props}
        onOpenChange={handleOpenChange}
      />
    </DialogContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 bg-rail/80',
        className
      )}
      {...props}
    />
  );
}

type TDialogContentProps = React.ComponentProps<
  typeof DialogPrimitive.Popup
> & {
  close?: () => void;
  onInteractOutside?: (event: Event) => void;
};

function DialogContent({
  className,
  children,
  close,
  onInteractOutside,
  ...props
}: TDialogContentProps) {
  const context = React.useContext(DialogContext);
  const eventHandlers = context?.eventHandlers;

  React.useEffect(() => {
    if (!eventHandlers) {
      return;
    }

    eventHandlers.current = { onInteractOutside };

    return () => {
      eventHandlers.current = {};
    };
  }, [eventHandlers, onInteractOutside]);

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-canvas data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-hidden rounded-[12px] border border-line p-6 shadow-2xl duration-150 sm:max-w-[410px]',
          className
        )}
        {...props}
      >
        {children}
        {close && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="focus-visible:ring-ring absolute top-5 right-5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5"
            onClick={close}
          >
            <XMarkIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 bg-nav px-6 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-lg leading-7 font-bold tracking-[-0.025em]',
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm leading-[19px]', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
};
