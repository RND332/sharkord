import { memo } from 'react';
import { cn } from '../lib/utils';

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TCircularProgressProps = {
  value: number;
  className?: string;
  children?: React.ReactNode;
};

const CircularProgress = memo(
  ({ value, className, children }: TCircularProgressProps) => {
    const percent = Math.min(100, Math.max(0, value));
    const dashOffset = CIRCUMFERENCE * (1 - percent / 100);

    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className={cn(
          'relative inline-flex size-10 items-center justify-center',
          className
        )}
      >
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {children}
      </div>
    );
  }
);

export { CircularProgress };
