import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type TContainerSize = {
  width: number;
  height: number;
};

// the resize observer reports the new size of the container before the
// browser paints the frame: the measurement is written into a ref and the
// layout effect applies it before the frame is painted, so the tiles of the
// stage follow the container in the same step
const useContainerSize = () => {
  const [containerSize, setContainerSize] = useState<TContainerSize | null>(
    null
  );
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const measuredSizeRef = useRef<TContainerSize | null>(null);
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const measured = measuredSizeRef.current;
    if (!measured) return;

    setContainerSize((current) => {
      if (
        current &&
        current.width === measured.width &&
        current.height === measured.height
      ) {
        return current;
      }

      return measured;
    });
  }, [measurementVersion]);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      const measured = measuredSizeRef.current;
      if (
        measured &&
        measured.width === rect.width &&
        measured.height === rect.height
      ) {
        return;
      }

      measuredSizeRef.current = { width: rect.width, height: rect.height };
      setMeasurementVersion((version) => version + 1);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();

      // the frame callback repeats the measurement for a container that is
      // still moving, a dock that animates its width reports its size again
      if (frameRef.current !== null) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measure();
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
