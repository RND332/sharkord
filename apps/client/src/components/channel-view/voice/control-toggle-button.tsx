import { cn } from '@/lib/utils';
import { Button, Tooltip } from '@sharkord/ui';
import { memo } from 'react';

type TIconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

type TControlToggleButtonProps = {
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
  enabledIcon: TIconComponent;
  disabledIcon: TIconComponent;

  enabledClassName: string;
  disabledClassName?: string;

  onClick: () => void;
  disabled?: boolean;
};

const ControlToggleButton = memo(
  ({
    enabled,
    enabledLabel,
    disabledLabel,
    enabledIcon: EnabledIcon,
    disabledIcon: DisabledIcon,
    enabledClassName,
    disabledClassName,
    onClick,
    disabled
  }: TControlToggleButtonProps) => {
    const label = enabled ? enabledLabel : disabledLabel;

    return (
      <Tooltip content={label}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-10.5 rounded-lg border border-control-border bg-raised transition-colors duration-150',
            enabled
              ? enabledClassName
              : (disabledClassName ?? 'hover:bg-panel'),
            disabled && 'opacity-60 hover:bg-raised'
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {enabled ? (
            <EnabledIcon className="size-4.5" />
          ) : (
            <DisabledIcon className="size-4.5" />
          )}
        </Button>
      </Tooltip>
    );
  }
);

ControlToggleButton.displayName = 'ControlToggleButton';

export { ControlToggleButton };
export type { TControlToggleButtonProps };
