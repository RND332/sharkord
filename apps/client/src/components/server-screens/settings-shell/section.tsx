import { memo, type ReactNode } from 'react';

type TSettingsSectionProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SettingsSection = memo(
  ({
    title,
    description,
    action,
    children,
    className
  }: TSettingsSectionProps) => {
    return (
      <section className={className}>
        <div className="border-b border-line pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              {description && (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {action && (
              <div className="flex shrink-0 items-center gap-1">{action}</div>
            )}
          </div>
        </div>
        <div className="space-y-4 pt-5">{children}</div>
      </section>
    );
  }
);

export { SettingsSection };
