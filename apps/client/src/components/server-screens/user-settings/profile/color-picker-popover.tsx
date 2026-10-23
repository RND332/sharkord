import { DEFAULT_PROFILE_COLOR } from '@dodecagon/shared';
import {
  ColorPicker,
  Popover,
  PopoverAnchor,
  PopoverContent
} from '@dodecagon/ui';
import { memo, useCallback, type ReactElement } from 'react';

type TColorPickerPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (color: string) => void;
  label: string;
  children: ReactElement;
};

const ColorPickerPopover = memo(
  ({
    open,
    onOpenChange,
    value,
    onChange,
    label,
    children
  }: TColorPickerPopoverProps) => {
    // the banner menu gives the focus back to the trigger when it closes, that
    // focus is outside of the picker and must not dismiss the popover
    const handleFocusOutside = useCallback((event: Event) => {
      event.preventDefault();
    }, []);

    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>{children}</PopoverAnchor>
        <PopoverContent
          side="right"
          align="start"
          aria-label={label}
          onFocusOutside={handleFocusOutside}
          className="flex w-fit flex-col gap-2 rounded-2xl p-2"
        >
          <span className="text-sm text-foreground">{label}</span>
          <ColorPicker
            value={value}
            onChange={onChange}
            defaultValue={DEFAULT_PROFILE_COLOR}
            ariaLabel={label}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

ColorPickerPopover.displayName = 'ColorPickerPopover';

export { ColorPickerPopover };
