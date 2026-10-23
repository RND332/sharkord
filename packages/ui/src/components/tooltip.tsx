import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import * as React from 'react';

import { cn } from '../lib/utils';

type TTooltipProviderProps = React.ComponentProps<
  typeof TooltipPrimitive.Provider
> & {
  delayDuration?: number;
  skipDelayDuration?: number;
};

function TooltipProvider({
  delayDuration = 0,
  skipDelayDuration,
  ...props
}: TTooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delayDuration}
      timeout={skipDelayDuration}
      {...props}
    />
  );
}

type TTooltipRootProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  delayDuration?: number;
  skipDelayDuration?: number;
};

function TooltipRoot({
  delayDuration,
  skipDelayDuration,
  ...props
}: TTooltipRootProps) {
  return (
    <TooltipProvider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
    >
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

type TTooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
> & {
  asChild?: boolean;
};

function TooltipTrigger({ asChild, children, ...props }: TTooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        render={children}
        {...props}
      />
    );
  }

  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

type TTooltipPositionerProps = React.ComponentProps<
  typeof TooltipPrimitive.Positioner
>;

type TTooltipContentProps = React.ComponentProps<
  typeof TooltipPrimitive.Popup
> &
  Pick<
    TTooltipPositionerProps,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  >;

function TooltipContent({
  className,
  side = 'top',
  align = 'center',
  sideOffset = 0,
  alignOffset,
  collisionPadding,
  children,
  ...props
}: TTooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'bg-rail text-foreground border border-line shadow-xl animate-in fade-in-0 zoom-in-95 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="bg-rail fill-rail z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

type TTooltipProps = {
  children: React.ReactElement;
  content: React.ReactNode;
  sideOffset?: number;
  asChild?: boolean;
};

const Tooltip = ({
  children,
  content,
  sideOffset = 4,
  asChild = true
}: TTooltipProps) => (
  <TooltipRoot delayDuration={1000}>
    <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
    <TooltipContent sideOffset={sideOffset}>{content}</TooltipContent>
  </TooltipRoot>
);

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
};
