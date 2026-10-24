import { cn } from '@/lib/utils';
import { Tooltip } from '@dodecagon/ui';
import { ChevronDownIcon, UsersIcon } from '@heroicons/react/24/outline';
import {
  isValidElement,
  memo,
  useCallback,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';

type TVoiceGridProps = {
  children: ReactNode[];
  pinnedCardId?: string;
  tileAspectRatio?: number;
  className?: string;
};

const OPTIMAL_CELL_ASPECT_RATIO = 1.5;

// the focused tile shows a bigger avatar than the tiles of the grid, the
// value is read by the participant card
const FOCUSED_AVATAR_CLASS = '[--voice-avatar-size:160px]';

const VoiceGrid = memo(
  ({ children, pinnedCardId, tileAspectRatio, className }: TVoiceGridProps) => {
    const [containerSize, setContainerSize] = useState<{
      width: number;
      height: number;
    } | null>(null);
    const [hideParticipants, setHideParticipants] = useState(false);
    const { t } = useTranslation();

    const handleToggleParticipants = useCallback(() => {
      setHideParticipants((hidden) => !hidden);
    }, []);

    const containerRef = useCallback((element: HTMLDivElement | null) => {
      if (!element) return;

      const updateSize = () => {
        const rect = element.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };

      updateSize();

      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(element);

      return () => resizeObserver.disconnect();
    }, []);

    const calculateOptimalGrid = (
      totalCards: number,
      containerWidth: number,
      containerHeight: number
    ) => {
      if (totalCards <= 1 || containerWidth <= 0 || containerHeight <= 0) {
        return { cols: 1 };
      }

      const maxCols = totalCards;

      let bestCols = 1;
      let bestScore = Infinity;

      for (let cols = 1; cols <= maxCols; cols++) {
        const rows = Math.ceil(totalCards / cols);
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        const cellAspectRatio = cellWidth / cellHeight;

        const score = Math.abs(cellAspectRatio - OPTIMAL_CELL_ASPECT_RATIO);
        if (score < bestScore) {
          bestScore = score;
          bestCols = cols;
        }
      }

      return { cols: bestCols };
    };

    const gridCols = useMemo(() => {
      const childArray = Array.isArray(children) ? children : [children];
      const totalCards = childArray.length;

      if (!containerSize) {
        return 1;
      }

      const { cols } = calculateOptimalGrid(
        totalCards,
        containerSize.width,
        containerSize.height
      );

      return cols;
    }, [children, containerSize]);

    const { pinnedCard, regularCards } = useMemo(() => {
      const childArray = Array.isArray(children) ? children : [children];

      if (pinnedCardId) {
        const pinned = childArray.find(
          (child: ReactNode) =>
            isValidElement(child) && child.key === pinnedCardId
        );

        const regular = childArray.filter(
          (child: ReactNode) =>
            !isValidElement(child) || child.key !== pinnedCardId
        );

        return { pinnedCard: pinned, regularCards: regular };
      }

      return { pinnedCard: null, regularCards: childArray };
    }, [children, pinnedCardId]);

    if (pinnedCardId && pinnedCard) {
      return (
        <div
          className={cn(
            // the top band keeps the stage actions clear of the pinned card
            'flex h-full flex-col gap-3 bg-rail px-7 pt-12 pb-3',
            className
          )}
        >
          <div className="relative min-h-0 flex-1">
            <div className={cn('size-full', FOCUSED_AVATAR_CLASS)}>
              {pinnedCard}
            </div>
            <div className="flex w-full justify-center absolute bottom-0 left-0 right-0 mb-5 z-2 pointer-events-none">
              <Tooltip
                content={
                  hideParticipants
                    ? t('showParticipants')
                    : t('hideParticipants')
                }
              >
                <button
                  className={cn(
                    'inline-flex h-8 w-16 items-center justify-center gap-1.5 rounded-full',
                    'pointer-events-auto border border-white/12 bg-black/80 shadow-xl transition-colors',
                    'hover:bg-black/90',
                    hideParticipants
                      ? 'inline-flex'
                      : 'hidden group-hover/voice-stage:inline-flex'
                  )}
                  onClick={handleToggleParticipants}
                  aria-label={
                    hideParticipants
                      ? t('showParticipants')
                      : t('hideParticipants')
                  }
                >
                  <ChevronDownIcon
                    className={cn(
                      'size-3.5 transition-transform duration-300 ease-in-out',
                      hideParticipants && 'rotate-180'
                    )}
                  />
                  <UsersIcon className="size-5" />
                </button>
              </Tooltip>
            </div>
          </div>
          {regularCards.length > 0 && (
            <div
              inert={hideParticipants}
              aria-hidden={hideParticipants}
              className={cn(
                'flex h-[90px] shrink-0 justify-center-safe gap-3 overflow-x-auto',
                'transition-[max-height,opacity] duration-300 ease-in-out',
                hideParticipants
                  ? 'max-h-0 opacity-0'
                  : 'max-h-[90px] opacity-100'
              )}
            >
              {regularCards.map((card, index) => (
                // the participant thumbnails keep the 16:9 shape of the stage
                // tiles, so a pinned view does not change the frame of a user
                <div key={index} className="aspect-video w-40 shrink-0">
                  {card}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const rows = Math.ceil(regularCards.length / gridCols);
    const lastRowCount = regularCards.length % gridCols || gridCols;
    const lastRowOffset =
      lastRowCount < gridCols ? ((gridCols - lastRowCount) / 2) * 100 : 0;
    const lastRowStart = regularCards.length - lastRowCount;

    const tileWidth =
      tileAspectRatio && containerSize
        ? Math.max(
            0,
            Math.min(
              (containerSize.width - 56 - (gridCols - 1) * 12) / gridCols,
              // the vertical padding of the grid below
              ((containerSize.height - 72 - (rows - 1) * 12) / rows) *
                tileAspectRatio
            )
          )
        : undefined;
    const tileHeight =
      tileWidth !== undefined && tileAspectRatio
        ? tileWidth / tileAspectRatio
        : undefined;

    return (
      <div
        ref={containerRef}
        className={cn(
          'grid size-full gap-3 bg-rail px-7 pt-12 pb-6',
          // a lone participant is the focused tile of the stage
          regularCards.length === 1 && FOCUSED_AVATAR_CLASS,
          className
        )}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, ${tileWidth !== undefined ? `${tileWidth}px` : '1fr'})`,
          gridTemplateRows: `repeat(${rows}, ${tileHeight !== undefined ? `${tileHeight}px` : '1fr'})`,
          alignContent: tileAspectRatio ? 'center' : undefined,
          justifyContent: tileAspectRatio ? 'center' : undefined
        }}
      >
        {regularCards.map((card, index) => (
          <div
            key={isValidElement(card) ? card.key : index}
            style={
              lastRowOffset && index >= lastRowStart
                ? { transform: `translateX(${lastRowOffset}%)` }
                : undefined
            }
          >
            {card}
          </div>
        ))}
      </div>
    );
  }
);

export { VoiceGrid };
