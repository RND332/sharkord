import { HexColorPicker } from 'react-colorful';
import { Button } from './button';
import { Input } from './input';

type TColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  ariaLabel: string;
};

const ColorPicker = ({
  value,
  onChange,
  defaultValue = '#FFFFFF',
  ariaLabel
}: TColorPickerProps) => {
  return (
    <div className="flex flex-col gap-2">
      <HexColorPicker color={value} onChange={onChange} />
      <Input
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange?.(defaultValue)}
      >
        Reset
      </Button>
    </div>
  );
};

export { ColorPicker };
