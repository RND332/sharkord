import { useCallback, useEffect, useRef, useState } from 'react';

// TODO: this might be improved in the future

type TUseScrollControllerProps = {
  messages: unknown[];
  fetching: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
  hasTypingUsers?: boolean;
};

type TUseScrollControllerReturn = {
  bindContainer: React.RefCallback<HTMLDivElement>;
  onScroll: () => void;
  scrollToBottom: () => void;
  onAsyncContentLoaded: () => void;
  isAtBottom: () => boolean;
};

const SCROLL_THRESHOLD = 80;

const useScrollController = ({
  messages,
  fetching,
  hasMore,
  loadMore,
  hasTypingUsers = false
}: TUseScrollControllerProps): TUseScrollControllerReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const bindContainer = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    setContainer(element);
  }, []);
  const hasInitialScroll = useRef(false);
  const shouldStickToBottom = useRef(true);
  const isProgrammaticScroll = useRef(false);
  const lastScrollTop = useRef(0);

  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    return distanceFromBottom <= 120;
  }, []);

  // scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    isProgrammaticScroll.current = true;
    container.scrollTop = container.scrollHeight;
    lastScrollTop.current = container.scrollTop;

    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, []);

  // detect scroll-to-top and load more messages
  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const scrolledUp = container.scrollTop < lastScrollTop.current;
    lastScrollTop.current = container.scrollTop;

    if (isProgrammaticScroll.current) return;

    const nearBottom = isNearBottom(container);
    // Scroll anchoring can move down before ResizeObserver reports growing media.
    if (nearBottom || scrolledUp) {
      shouldStickToBottom.current = nearBottom;
    }

    if (fetching) return;

    if (container.scrollTop <= SCROLL_THRESHOLD && hasMore) {
      const previousDistanceFromEnd =
        container.scrollHeight - container.scrollTop;

      loadMore().then(() => {
        container.scrollTop = container.scrollHeight - previousDistanceFromEnd;
        shouldStickToBottom.current = isNearBottom(container);
      });
    }
  }, [loadMore, hasMore, fetching, isNearBottom]);

  // Cached history should reach the bottom while its latest-page refresh is in flight.
  useEffect(() => {
    if (!containerRef.current) return;
    if (messages.length === 0) return;

    if (hasInitialScroll.current) return;

    scrollToBottom();
    hasInitialScroll.current = true;
    shouldStickToBottom.current = true;
  }, [fetching, messages.length, scrollToBottom, containerRef]);

  // if user is already at the top when fetching completes
  // trigger another page load without requiring an extra scroll event
  useEffect(() => {
    const container = containerRef.current;

    if (!container || fetching || !hasMore) {
      return;
    }

    // the first page is still on its way, an empty container sits at the top
    // and would ask for a page that the initial load already brings
    if (messages.length === 0) {
      return;
    }

    if (container.scrollTop <= SCROLL_THRESHOLD) {
      onScroll();
    }
  }, [fetching, hasMore, messages.length, onScroll]);

  // auto-scroll on new messages if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasInitialScroll.current || messages.length === 0)
      return;

    if (!shouldStickToBottom.current) return;

    const timer = setTimeout(() => {
      scrollToBottom();
    }, 10);

    return () => clearTimeout(timer);
  }, [messages, hasTypingUsers, scrollToBottom]);

  // Keep observing both viewport and content through refreshes and late media loads.
  useEffect(() => {
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottom.current) {
        return;
      }

      scrollToBottom();
    });

    observer.observe(container);
    const content = container.firstElementChild;
    if (content) observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [container, messages.length, scrollToBottom]);

  // scroll to bottom when async content loads (e.g. metadata images)
  const onAsyncContentLoaded = useCallback(() => {
    if (shouldStickToBottom.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;

    if (!container) return true;

    return isNearBottom(container);
  }, [isNearBottom]);

  return {
    bindContainer,
    onScroll,
    scrollToBottom,
    onAsyncContentLoaded,
    isAtBottom
  };
};

export { useScrollController };
