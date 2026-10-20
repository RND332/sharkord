import { cn } from '@/lib/utils';
import { memo, type ReactNode } from 'react';

type TSettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const SettingsRow = memo(
  ({ label, description, children, className }: TSettingsRowProps) => {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-between gap-4 border-b border-line py-[15px]',
          className
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm leading-[18px] text-foreground">
            {label}
          </span>
          {description && (
            <span className="text-sm leading-4 text-muted-foreground">
              {description}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    );
  }
);

SettingsRow.displayName = 'SettingsRow';

type TSettingsGroupLabelProps = {
  children: ReactNode;
};

const SettingsGroupLabel = memo(({ children }: TSettingsGroupLabelProps) => {
  return (
    <div className="text-sm font-bold uppercase leading-4 tracking-[0.08em] text-subtle-foreground">
      {children}
    </div>
  );
});

SettingsGroupLabel.displayName = 'SettingsGroupLabel';

export { SettingsGroupLabel, SettingsRow };
