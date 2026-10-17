import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_TIMEOUT = 2500;

export const useMouseActivity = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // state instead of a ref so the listeners attach when the stage mounts after the first render
  const stageRef = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  const resetIdleTimer = useCallback(() => {
    setIsVisible(true);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsVisible(false), IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    if (!element) return;

    const onActivity = () => resetIdleTimer();

    element.addEventListener('pointermove', onActivity);
    element.addEventListener('pointerdown', onActivity);
    element.addEventListener('touchstart', onActivity);
    element.addEventListener('keydown', onActivity);

    return () => {
      element.removeEventListener('pointermove', onActivity);
      element.removeEventListener('pointerdown', onActivity);
      element.removeEventListener('touchstart', onActivity);
      element.removeEventListener('keydown', onActivity);
      clearTimeout(idleTimerRef.current);
    };
  }, [element, resetIdleTimer]);

  return { isVisible, stageRef };
};
