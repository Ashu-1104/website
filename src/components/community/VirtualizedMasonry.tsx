'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type MasonrySize = { width: number; height: number };

export type MasonryRenderMeta = {
  priority: boolean;
  isNearViewport: boolean;
};

type MasonryLayoutItem<T> = {
  item: T;
  key: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_GAP_PX = 12;
const DEFAULT_MIN_COLUMN_WIDTH_PX = 240;
const DEFAULT_OVERSCAN_PX = 900;
const DEFAULT_PRIORITY_COUNT = 3;
const DEFAULT_PREFETCH_AHEAD_PX = 800;
const DEFAULT_PREFETCH_COUNT = 6;

const prefetchedImages = new Set<string>();

function prefetchImage(url: string) {
  if (!url) return;
  if (prefetchedImages.has(url)) return;
  prefetchedImages.add(url);

  const img = new Image();
  img.src = url;
  if (typeof img.decode === 'function') {
    void img.decode().catch(() => undefined);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      setWidth((current) => (current === next ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function useViewport() {
  const [scrollY, setScrollY] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setScrollY(window.scrollY);
      });
    };

    const onResize = () => setHeight(window.innerHeight);

    setScrollY(window.scrollY);
    setHeight(window.innerHeight);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { scrollY, height };
}

function computeColumnCount(containerWidth: number, minColumnWidth: number, gapPx: number): number {
  if (containerWidth <= 0) return 1;
  const raw = Math.floor((containerWidth + gapPx) / (minColumnWidth + gapPx));
  return clamp(raw, 1, 6);
}

function computeMasonryLayout<T>(args: {
  items: T[];
  containerWidth: number;
  columnCount: number;
  gapPx: number;
  getKey: (item: T) => string;
  getSize: (item: T) => MasonrySize;
}): { layout: MasonryLayoutItem<T>[]; columnWidth: number; totalHeight: number } {
  const { items, containerWidth, columnCount, gapPx, getKey, getSize } = args;

  if (containerWidth <= 0) {
    return { layout: [], columnWidth: 0, totalHeight: 0 };
  }

  const safeColumns = Math.max(1, columnCount);
  const columnWidth = safeColumns === 1
    ? containerWidth
    : (containerWidth - gapPx * (safeColumns - 1)) / safeColumns;

  const columnHeights = new Array<number>(safeColumns).fill(0);
  const layout: MasonryLayoutItem<T>[] = [];

  for (const [index, item] of items.entries()) {
    const key = getKey(item);
    const size = getSize(item);
    const aspect = size.width > 0 ? size.height / size.width : 1;
    const height = Math.max(60, Math.round(columnWidth * (Number.isFinite(aspect) ? aspect : 1)));

    let bestColumn = 0;
    for (let c = 1; c < safeColumns; c += 1) {
      if (columnHeights[c] < columnHeights[bestColumn]) bestColumn = c;
    }

    const x = bestColumn * (columnWidth + gapPx);
    const y = columnHeights[bestColumn];
    columnHeights[bestColumn] = y + height + gapPx;

    layout.push({
      item,
      key,
      index,
      x,
      y,
      width: Math.round(columnWidth),
      height,
    });
  }

  const totalHeight = Math.max(0, ...columnHeights) - gapPx;
  return { layout, columnWidth, totalHeight: Math.max(0, Math.ceil(totalHeight)) };
}

export default function VirtualizedMasonry<T>(props: {
  items: T[];
  getKey: (item: T) => string;
  getSize: (item: T) => MasonrySize;
  renderItem: (item: T, meta: MasonryRenderMeta) => React.ReactNode;
  getPrefetchUrl?: (item: T) => string | null | undefined;
  gapPx?: number;
  minColumnWidthPx?: number;
  overscanPx?: number;
  priorityCount?: number;
  prefetchAheadPx?: number;
  prefetchCount?: number;
}) {
  const {
    items,
    getKey,
    getSize,
    renderItem,
    getPrefetchUrl,
    gapPx = DEFAULT_GAP_PX,
    minColumnWidthPx = DEFAULT_MIN_COLUMN_WIDTH_PX,
    overscanPx = DEFAULT_OVERSCAN_PX,
    priorityCount = DEFAULT_PRIORITY_COUNT,
    prefetchAheadPx = DEFAULT_PREFETCH_AHEAD_PX,
    prefetchCount = DEFAULT_PREFETCH_COUNT,
  } = props;

  const { ref: containerRef, width: containerWidth } = useElementWidth<HTMLDivElement>();
  const { scrollY, height: viewportHeight } = useViewport();
  const [containerDocTop, setContainerDocTop] = useState(0);

  const columnCount = useMemo(
    () => computeColumnCount(containerWidth, minColumnWidthPx, gapPx),
    [containerWidth, gapPx, minColumnWidthPx]
  );

  const { layout, totalHeight } = useMemo(
    () => computeMasonryLayout({ items, containerWidth, columnCount, gapPx, getKey, getSize }),
    [items, containerWidth, columnCount, gapPx, getKey, getSize]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      setContainerDocTop(element.getBoundingClientRect().top + window.scrollY);
    };

    update();

    const onResize = () => update();
    window.addEventListener('resize', onResize, { passive: true });

    const bodyClassObserver = new MutationObserver(() => update());
    bodyClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', onResize);
      bodyClassObserver.disconnect();
    };
  }, [containerRef, containerWidth, columnCount]);

  const visible = useMemo(() => {
    const relativeTop = scrollY - containerDocTop;
    const startY = relativeTop - overscanPx;
    const endY = relativeTop + viewportHeight + overscanPx;

    return layout.filter((entry) => entry.y + entry.height >= startY && entry.y <= endY);
  }, [containerDocTop, layout, overscanPx, scrollY, viewportHeight]);

  useEffect(() => {
    if (!getPrefetchUrl) return;
    if (!layout.length) return;

    const relativeTop = scrollY - containerDocTop;
    const startY = relativeTop + viewportHeight;
    const endY = startY + prefetchAheadPx;

    const candidates = layout
      .filter((entry) => entry.y >= startY && entry.y <= endY)
      .sort((a, b) => a.y - b.y)
      .slice(0, prefetchCount);

    for (const entry of candidates) {
      const url = getPrefetchUrl(entry.item);
      if (url) prefetchImage(url);
    }
  }, [containerDocTop, getPrefetchUrl, layout, prefetchAheadPx, prefetchCount, scrollY, viewportHeight]);

  const nearViewport = useMemo(() => {
    const relativeTop = scrollY - containerDocTop;
    const startY = relativeTop - overscanPx * 1.5;
    const endY = relativeTop + viewportHeight + overscanPx * 1.5;
    const set = new Set<string>();
    for (const entry of layout) {
      if (entry.y + entry.height >= startY && entry.y <= endY) set.add(entry.key);
    }
    return set;
  }, [containerDocTop, layout, overscanPx, scrollY, viewportHeight]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: totalHeight }}>
      {visible.map((entry) => (
        <div
          key={entry.key}
          className="absolute"
          style={{
            width: entry.width,
            height: entry.height,
            transform: `translate3d(${entry.x}px, ${entry.y}px, 0)`,
            willChange: 'transform',
            contain: 'layout paint size',
          }}
        >
          {renderItem(entry.item, {
            priority: entry.index < priorityCount,
            isNearViewport: nearViewport.has(entry.key),
          })}
        </div>
      ))}
    </div>
  );
}
