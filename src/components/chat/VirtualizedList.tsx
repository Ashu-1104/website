'use client';

import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type VirtualizedListProps<TItem> = {
  items: readonly TItem[];
  itemHeight: number;
  overscan?: number;
  className?: string;
  ariaLabel?: string;
  getItemKey: (item: TItem, index: number) => string;
  renderItem: (item: TItem, index: number) => React.ReactNode;
};

export type VirtualizedListHandle = {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
};

type Range = {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  viewportHeight: number;
};

function VirtualizedListInner<TItem>(
  {
    items,
    itemHeight,
    overscan = 4,
    className,
    ariaLabel,
    getItemKey,
    renderItem,
  }: VirtualizedListProps<TItem>,
  ref: React.ForwardedRef<VirtualizedListHandle>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  // Track if we should preserve scroll position (prevent auto-scroll on navigation)
  const preserveScrollRef = useRef(false);

  const [range, setRange] = useState<Range>(() => ({
    startIndex: 0,
    endIndex: Math.min(items.length, 12),
    offsetY: 0,
    viewportHeight: 0,
  }));

  const totalHeight = items.length * itemHeight;

  const computeRange = useCallback(
    (scrollTop: number, viewportHeight: number): Range => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
      );
      return {
        startIndex,
        endIndex,
        offsetY: startIndex * itemHeight,
        viewportHeight,
      };
    },
    [itemHeight, items.length, overscan]
  );

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = containerRef.current;
      if (!el) return;

      const nextRange = computeRange(el.scrollTop, el.clientHeight);
      lastScrollTopRef.current = el.scrollTop;

      // Only update state when indices change to avoid re-rendering on every pixel scroll.
      setRange((prev) => {
        if (
          prev.startIndex === nextRange.startIndex &&
          prev.endIndex === nextRange.endIndex &&
          prev.viewportHeight === nextRange.viewportHeight
        ) {
          return prev;
        }
        return nextRange;
      });
    });
  }, [computeRange]);

  const onScroll = useCallback(() => {
    scheduleUpdate();
  }, [scheduleUpdate]);

  // Expose scrollToIndex method via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, behavior: ScrollBehavior = 'auto') => {
      const el = containerRef.current;
      if (!el) return;
      if (index < 0 || index >= items.length) return;

      const targetScrollTop = index * itemHeight;
      const viewportHeight = el.clientHeight;
      const currentScrollTop = el.scrollTop;

      // Check if the item is already fully visible
      const itemTop = targetScrollTop;
      const itemBottom = targetScrollTop + itemHeight;
      const viewportTop = currentScrollTop;
      const viewportBottom = currentScrollTop + viewportHeight;

      if (itemTop >= viewportTop && itemBottom <= viewportBottom) {
        // Item is already visible, no need to scroll
        return;
      }

      // Scroll to bring the item into view (center it if possible)
      const centeredScrollTop = Math.max(0, targetScrollTop - (viewportHeight - itemHeight) / 2);
      preserveScrollRef.current = true;
      el.scrollTo({ top: centeredScrollTop, behavior });
    },
  }), [items.length, itemHeight]);

  // Measure/track container height changes (resizes, sidebar expand, etc.)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const nextRange = computeRange(lastScrollTopRef.current, el.clientHeight);
      setRange((prev) => {
        if (
          prev.startIndex === nextRange.startIndex &&
          prev.endIndex === nextRange.endIndex &&
          prev.viewportHeight === nextRange.viewportHeight
        ) {
          return prev;
        }
        return nextRange;
      });
    });

    ro.observe(el);
    // Initialize with real measurements.
    const initialRange = computeRange(el.scrollTop, el.clientHeight);
    setRange(initialRange);

    return () => {
      ro.disconnect();
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [computeRange]);

  const visibleItems = useMemo(
    () => items.slice(range.startIndex, range.endIndex),
    [items, range.endIndex, range.startIndex]
  );

  return (
    <div
      ref={containerRef}
      className={cn('chat-virtual-list', className)}
      onScroll={onScroll}
      role="list"
      aria-label={ariaLabel}
    >
      <div className="chat-virtual-spacer" style={{ height: totalHeight }}>
        <div
          className="chat-virtual-inner"
          style={{ transform: `translateY(${range.offsetY}px)` }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = range.startIndex + index;
            return (
              <div
                key={getItemKey(item, actualIndex)}
                style={{ height: itemHeight }}
                role="listitem"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Use forwardRef with a generic type helper
const VirtualizedList = forwardRef(VirtualizedListInner) as <TItem>(
  props: VirtualizedListProps<TItem> & { ref?: React.Ref<VirtualizedListHandle> }
) => ReturnType<typeof VirtualizedListInner>;

export default VirtualizedList;

