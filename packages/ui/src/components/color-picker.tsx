import { PencilIcon } from '@heroicons/react/24/outline';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type TColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  defaultValue?: string;
  ariaLabel: string;
};

const ColorPicker = ({
  value,
  onChange,
  defaultValue = '#FFFFFF',
  error,
  ariaLabel
}: TColorPickerProps) => {
  return (
    <div className="flex flex-col">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="group relative h-32 w-full cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              style={{ backgroundColor: value }}
              className={cn(
                'h-32 w-full rounded-md border transition-opacity group-hover:opacity-70',
                error ? 'border-red-500' : 'border-border'
              )}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-black/50 p-3">
                <PencilIcon aria-hidden="true" className="h-6 w-6 text-white" />
              </div>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-2 w-fit h-fit p-2 rounded-2xl">
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
        </PopoverContent>
      </Popover>
      {error && <span className="text-sm text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export { ColorPicker };
