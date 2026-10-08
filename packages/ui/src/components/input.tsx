import * as React from 'react';
import { cn } from '../lib/utils';

type TFieldErrors = Record<string, string | undefined>;

type InputProps = React.ComponentProps<'input'> & {
  error?: string;
  resetError?: React.Dispatch<React.SetStateAction<TFieldErrors>>;
  onEnter?: () => void;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, error, resetError, onChange, name, onEnter, ...props },
    ref
  ) => {
    const onChangeHandler = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (resetError && name && error && error !== '') {
          resetError((prev) => {
            return {
              ...prev,
              [name]: ''
            };
          });
        }

        onChange?.(e);
      },
      [resetError, onChange, error, name]
    );

    const onKeyDownHandler = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      },
      [onEnter]
    );

    return (
      <div className="flex-1 flex-col gap-1">
        <input
          ref={ref}
          type={type}
          data-slot="input"
          aria-invalid={!!error}
          className={cn(
            'file:text-foreground placeholder:text-subtle-foreground selection:bg-primary selection:text-primary-foreground border-input h-11 w-full min-w-0 rounded-[7px] border bg-panel px-3 py-2 text-base transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-2',
            'aria-invalid:ring-destructive/30 aria-invalid:border-destructive',
            className
          )}
          onChange={onChangeHandler}
          onKeyDown={onKeyDownHandler}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
