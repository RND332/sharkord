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
        <div className="border-b border-line pb-[14px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[26px] font-bold leading-8 tracking-[-0.02em]">
                {title}
              </h2>
              {description && (
                <p className="mt-[7px] text-sm leading-[21px] text-muted-foreground">
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
