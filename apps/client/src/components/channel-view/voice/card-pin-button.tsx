import { memo, useCallback, useRef, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

type TCardPinButtonProps = {
  name: string;
  isPinned: boolean;
  onToggle: () => void;
};

export const CardPinButton = memo(
  ({ name, isPinned, onToggle }: TCardPinButtonProps) => {
    const { t } = useTranslation('common');
    const start = useRef({ x: 0, y: 0 });
    const handleMouseDown = useCallback((event: MouseEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    }, []);
    const handleClick = useCallback(
      (event: MouseEvent) => {
        if (
          event.detail &&
          Math.hypot(
            event.clientX - start.current.x,
            event.clientY - start.current.y
          ) > 5
        )
          return;
        onToggle();
      },
      [onToggle]
    );

    return (
      <button
        type="button"
        aria-label={t(isPinned ? 'unpinCard' : 'pinCard', { name })}
        aria-pressed={isPinned}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="absolute inset-0 z-1 rounded-[inherit] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />
    );
  }
);
