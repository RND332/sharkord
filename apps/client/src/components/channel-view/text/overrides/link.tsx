import { cn } from '@/lib/utils';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { memo } from 'react';

type TLinkOverrideProps = {
  link: string;
  label?: string;
  className?: string;
};

const LinkOverride = memo(({ link, label, className }: TLinkOverrideProps) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="text-xs hover:underline text-accent-text"
      >
        {label || link}
      </a>
      <ArrowTopRightOnSquareIcon className="size-[0.8rem]" />
    </div>
  );
});

export { LinkOverride };
