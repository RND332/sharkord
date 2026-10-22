import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type TListWithSeparatorsProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
};

const ListWithSeparators = <T,>({
  items,
  getKey,
  renderItem,
  className
}: TListWithSeparatorsProps<T>) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
};

export { ListWithSeparators };
