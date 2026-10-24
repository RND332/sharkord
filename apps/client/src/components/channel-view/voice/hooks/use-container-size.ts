import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

type TContainerSize = {
  width: number;
  height: number;
};

// the resize observer reports the new size of the container before the
// browser paints the frame, so the measurement is applied right away: the
// tiles of the stage follow the container in the same step and never lag
// behind a dock that opens or closes
const useContainerSize = () => {
  const [containerSize, setContainerSize] = useState<TContainerSize | null>(
    null
  );
  const measuredSizeRef = useRef<TContainerSize | null>(null);
  const frameRef = useRef<number | null>(null);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };

    const applySize = (size: TContainerSize) => {
      const measured = measuredSizeRef.current;
      if (
        measured &&
        measured.width === size.width &&
        measured.height === size.height
      ) {
        return;
      }

      measuredSizeRef.current = size;
      // the update is flushed synchronously, so the browser paints the frame
      // with the new layout instead of showing the previous one first
      flushSync(() => {
        setContainerSize(size);
      });
    };

    const measured = measure();
    measuredSizeRef.current = measured;
    setContainerSize(measured);

    const resizeObserver = new ResizeObserver(() => {
      applySize(measure());

      // the frame callback repeats the measurement in the frame that follows
      // the notification: a container that is still moving reports its size
      // again and the tiles stay on the size of the container
      if (frameRef.current !== null) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        applySize(measure());
      });
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return { containerRef, containerSize };
};

export { useContainerSize };
export type { TContainerSize };
