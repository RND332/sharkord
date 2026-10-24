import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import * as React from 'react';

import { cn } from '../lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[checked]:bg-success-solid data-[unchecked]:bg-line data-[unchecked]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] focus-visible:ring-ring inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-primary-foreground data-[unchecked]:bg-muted-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[checked]:translate-x-[18px] data-[unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
