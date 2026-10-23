import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode
} from 'react';

const RenderClockContext = createContext<(() => number) | null>(null);

// the server and the browser have to show the same moment, otherwise the first
// render of the browser would not match the html of the server. the fixed time
// is only used until the hydration is over, after that the real clock takes over
export const RenderClockProvider = ({
  children,
  now
}: {
  children: ReactNode;
  now: number;
}) => {
  const getNowRef = useRef<() => number>(() => now);

  useEffect(() => {
    getNowRef.current = () => Date.now();
  }, []);

  const getNow = useCallback(() => getNowRef.current(), []);

  return (
    <RenderClockContext.Provider value={getNow}>
      {children}
    </RenderClockContext.Provider>
  );
};

export const useRenderClock = (): (() => number) => {
  const getNow = useContext(RenderClockContext);

  // the function has to keep its identity, the effects that read the clock
  // would run again on every render otherwise
  return useCallback(() => (getNow ? getNow() : Date.now()), [getNow]);
};
