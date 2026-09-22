'use client';

/**
 * MaskEditor
 *
 * A lightweight inpainting mask editor that lets users:
 * - Pan/drag (mouse tool)
 * - Paint a WHITE mask (brush tool)
 * - Erase mask areas (eraser tool)
 * - Adjust brush thickness
 * - Zoom in/out
 *
 * Implementation notes:
 * - Uses a visible canvas for rendering (image + mask overlay).
 * - Maintains an offscreen canvas for the mask only (transparent background).
 * - Exposes an export method that produces a BLACK background + WHITE mask PNG,
 *   matching typical inpainting APIs (white = affected, black = preserved).
 *
 * Rendering is batched via requestAnimationFrame for smooth interaction.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Brush,
  Eraser,
  MousePointer2,
  Redo2,
  SlidersHorizontal,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tool = 'pan' | 'brush' | 'eraser';

export type MaskEditorHandle = {
  exportMaskDataUrl: () => string | null;
  clearMask: () => void;
};

type MaskEditorProps = {
  imageSrc: string;
  className?: string;
};

type StrokePoint = { x: number; y: number };
type MaskStroke = {
  tool: Exclude<Tool, 'pan'>;
  lineWidth: number; // in image pixels
  points: StrokePoint[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_FACTOR = 1.2;

const DEFAULT_BRUSH_SIZE = 28; // screen px
const MIN_BRUSH_SIZE = 6;
const MAX_BRUSH_SIZE = 90;
const MAX_HISTORY_STEPS = 30;

type ViewState = {
  stageWidth: number;
  stageHeight: number;
  zoom: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export default forwardRef<MaskEditorHandle, MaskEditorProps>(function MaskEditor(
  { imageSrc, className },
  ref
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorIndicatorRef = useRef<HTMLDivElement>(null);

  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const viewRef = useRef<ViewState>({
    stageWidth: 0,
    stageHeight: 0,
    zoom: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const isPointerActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ sx: number; sy: number; offsetX: number; offsetY: number } | null>(null);
  const didModifyMaskRef = useRef(false);

  // Cursor indicator state is managed via refs + rAF to avoid re-rendering on every pointer move.
  const cursorRafIdRef = useRef<number | null>(null);
  const cursorStateRef = useRef<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  // Mask history (undo/redo):
  // Store vector strokes (not ImageData snapshots) so high-res images don't explode memory usage.
  // On undo/redo we rebuild the mask canvas by replaying the applied strokes.
  const historyRef = useRef<MaskStroke[]>([]);
  const historyIndexRef = useRef<number>(0); // how many strokes are currently applied
  const activeStrokeRef = useRef<MaskStroke | null>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [zoom, setZoom] = useState(1);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const cursor = useMemo(() => {
    switch (tool) {
      case 'pan':
        return zoom > 1 ? 'grab' : 'default';
      case 'eraser':
      case 'brush':
        return 'crosshair';
      default:
        return 'default';
    }
  }, [tool, zoom]);

  const syncHistoryControls = useCallback(() => {
    const index = historyIndexRef.current;
    const length = historyRef.current.length;
    setCanUndo(index > 0);
    setCanRedo(index < length);
  }, []);

  const replayHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    const appliedCount = clamp(historyIndexRef.current, 0, historyRef.current.length);
    for (let i = 0; i < appliedCount; i += 1) {
      const stroke = historyRef.current[i];
      if (!stroke || stroke.points.length === 0) continue;

      const isEraser = stroke.tool === 'eraser';
      ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.lineWidth;
      ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
      ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, stroke.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let p = 1; p < stroke.points.length; p += 1) {
        ctx.lineTo(stroke.points[p].x, stroke.points[p].y);
      }
      ctx.stroke();
    }
  }, []);

  const commitStrokeToHistory = useCallback(
    (stroke: MaskStroke) => {
      // Drop redo history if we commit after an undo.
      if (historyIndexRef.current < historyRef.current.length) {
        historyRef.current.splice(historyIndexRef.current);
      }

      historyRef.current.push(stroke);
      if (historyRef.current.length > MAX_HISTORY_STEPS) {
        historyRef.current.shift();
      }

      historyIndexRef.current = historyRef.current.length;
      syncHistoryControls();
    },
    [syncHistoryControls]
  );

  const undo = useCallback(() => {
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) return;
    historyIndexRef.current = nextIndex;
    syncHistoryControls();
    replayHistory();
  }, [replayHistory, syncHistoryControls]);

  const redo = useCallback(() => {
    const nextIndex = historyIndexRef.current + 1;
    if (nextIndex > historyRef.current.length) return;
    historyIndexRef.current = nextIndex;
    syncHistoryControls();
    replayHistory();
  }, [replayHistory, syncHistoryControls]);

  const scheduleCursorIndicator = useCallback(() => {
    if (cursorRafIdRef.current != null) return;
    cursorRafIdRef.current = window.requestAnimationFrame(() => {
      cursorRafIdRef.current = null;
      const node = cursorIndicatorRef.current;
      if (!node) return;

      const { visible, x, y } = cursorStateRef.current;
      node.style.opacity = visible ? '1' : '0';
      node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }, []);

  const updateCursorFromPointerEvent = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>, opts?: { visible?: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      cursorStateRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        visible: opts?.visible ?? true,
      };
      scheduleCursorIndicator();
    },
    [scheduleCursorIndicator]
  );

  const scheduleRender = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const canvas = canvasRef.current;
      const img = baseImageRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !img || !maskCanvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const { stageWidth, stageHeight, scale, offsetX, offsetY } = viewRef.current;
      if (stageWidth <= 0 || stageHeight <= 0) return;

      const nextWidth = Math.max(1, Math.round(stageWidth * dpr));
      const nextHeight = Math.max(1, Math.round(stageHeight * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, stageWidth, stageHeight);

      // Draw image
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      ctx.drawImage(img, offsetX, offsetY, imgW * scale, imgH * scale);

      // Draw mask (white paint on image)
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(maskCanvas, offsetX, offsetY, imgW * scale, imgH * scale);
      ctx.restore();
    });
  }, []);

  const recalcView = useCallback(
    (opts?: { zoom?: number; stageWidth?: number; stageHeight?: number; resetCenter?: boolean }) => {
      const img = baseImageRef.current;
      if (!img) return;

      const prev = viewRef.current;
      const nextStageWidth = opts?.stageWidth ?? prev.stageWidth;
      const nextStageHeight = opts?.stageHeight ?? prev.stageHeight;
      const nextZoom = opts?.zoom ?? prev.zoom;

      if (nextStageWidth <= 0 || nextStageHeight <= 0) return;

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const baseScale = Math.min(nextStageWidth / imgW, nextStageHeight / imgH);
      const nextScale = baseScale * nextZoom;

      // Keep the same image point at the stage center when zooming/resizing.
      const prevStageWidth = prev.stageWidth || nextStageWidth;
      const prevStageHeight = prev.stageHeight || nextStageHeight;

      const centerImgX =
        opts?.resetCenter || prev.scale === 0
          ? imgW / 2
          : (prevStageWidth / 2 - prev.offsetX) / prev.scale;
      const centerImgY =
        opts?.resetCenter || prev.scale === 0
          ? imgH / 2
          : (prevStageHeight / 2 - prev.offsetY) / prev.scale;

      viewRef.current = {
        stageWidth: nextStageWidth,
        stageHeight: nextStageHeight,
        zoom: nextZoom,
        scale: nextScale,
        offsetX: nextStageWidth / 2 - centerImgX * nextScale,
        offsetY: nextStageHeight / 2 - centerImgY * nextScale,
      };

      scheduleRender();
    },
    [scheduleRender]
  );

  const stagePointToImagePoint = useCallback((sx: number, sy: number) => {
    const img = baseImageRef.current;
    if (!img) return null;
    const { scale, offsetX, offsetY } = viewRef.current;
    if (scale === 0) return null;

    const imgX = (sx - offsetX) / scale;
    const imgY = (sy - offsetY) / scale;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (imgX < 0 || imgY < 0 || imgX > imgW || imgY > imgH) return null;

    return { x: imgX, y: imgY };
  }, []);

  const drawStrokeSegment = useCallback(
    (
      from: { x: number; y: number },
      to: { x: number; y: number },
      currentTool: Exclude<Tool, 'pan'>,
      lineWidth: number
    ) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = lineWidth;

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255,255,255,1)';
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    []
  );

  const drawDot = useCallback(
    (at: { x: number; y: number }, currentTool: Exclude<Tool, 'pan'>, lineWidth: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      const radius = clamp(lineWidth / 2, 0.5, 200);

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255,255,255,1)';
      }

      ctx.beginPath();
      ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      // For mouse we only draw/pan with the primary button; for touch/stylus,
      // PointerEvent.button may not be reliable, so we allow it.
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.focus({ preventScroll: true });

      updateCursorFromPointerEvent(event, { visible: tool === 'brush' || tool === 'eraser' });

      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;

      if (tool === 'pan') {
        // Pan/drag is only meaningful once the user zooms in.
        if (viewRef.current.zoom <= 1) return;

        isPointerActiveRef.current = true;
        activePointerIdRef.current = event.pointerId;
        canvas.setPointerCapture(event.pointerId);

        panStartRef.current = {
          sx,
          sy,
          offsetX: viewRef.current.offsetX,
          offsetY: viewRef.current.offsetY,
        };
        scheduleRender();
        return;
      }

      const point = stagePointToImagePoint(sx, sy);
      if (!point) return;

      const lineWidth = clamp(brushSize / Math.max(viewRef.current.scale, 0.0001), 1, 400);

      didModifyMaskRef.current = false;
      isPointerActiveRef.current = true;
      activePointerIdRef.current = event.pointerId;
      canvas.setPointerCapture(event.pointerId);

      lastPointRef.current = point;
      activeStrokeRef.current = { tool, lineWidth, points: [point] };
      drawDot(point, tool, lineWidth);
      didModifyMaskRef.current = true;
      scheduleRender();
    },
    [brushSize, drawDot, scheduleRender, stagePointToImagePoint, tool, updateCursorFromPointerEvent]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Update the brush/eraser indicator even when we are not actively drawing.
      const shouldShowIndicator = tool === 'brush' || tool === 'eraser';
      updateCursorFromPointerEvent(event, { visible: shouldShowIndicator });

      if (!isPointerActiveRef.current) return;
      if (activePointerIdRef.current !== event.pointerId) return;

      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;

      if (tool === 'pan') {
        if (!panStartRef.current) return;
        if (viewRef.current.zoom <= 1) return;
        const dx = sx - panStartRef.current.sx;
        const dy = sy - panStartRef.current.sy;
        viewRef.current.offsetX = panStartRef.current.offsetX + dx;
        viewRef.current.offsetY = panStartRef.current.offsetY + dy;
        scheduleRender();
        return;
      }

      const nextPoint = stagePointToImagePoint(sx, sy);
      const prevPoint = lastPointRef.current;
      if (!nextPoint || !prevPoint) return;

      const activeStroke = activeStrokeRef.current;
      if (activeStroke) {
        const lastRecorded = activeStroke.points[activeStroke.points.length - 1];
        if (lastRecorded.x !== nextPoint.x || lastRecorded.y !== nextPoint.y) {
          activeStroke.points.push(nextPoint);
        }
      }

      drawStrokeSegment(prevPoint, nextPoint, tool, activeStroke?.lineWidth ?? 1);
      lastPointRef.current = nextPoint;
      didModifyMaskRef.current = true;
      scheduleRender();
    },
    [drawStrokeSegment, scheduleRender, stagePointToImagePoint, tool, updateCursorFromPointerEvent]
  );

  const endPointerInteraction = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (activePointerIdRef.current !== event.pointerId) return;

    isPointerActiveRef.current = false;
    activePointerIdRef.current = null;
    panStartRef.current = null;

    if ((tool === 'brush' || tool === 'eraser') && didModifyMaskRef.current) {
      const stroke = activeStrokeRef.current;
      const lastPoint = lastPointRef.current;
      if (stroke && lastPoint) {
        const lastRecorded = stroke.points[stroke.points.length - 1];
        if (lastRecorded.x !== lastPoint.x || lastRecorded.y !== lastPoint.y) {
          stroke.points.push(lastPoint);
        }
      }

      if (stroke && stroke.points.length > 0) {
        commitStrokeToHistory(stroke);
      }
      activeStrokeRef.current = null;
      scheduleRender();
    }
    didModifyMaskRef.current = false;
    lastPointRef.current = null;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if capture isn't held.
    }
  }, [commitStrokeToHistory, scheduleRender, tool]);

  const zoomIn = useCallback(() => {
    setZoom((current) => clamp(current * ZOOM_FACTOR, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => clamp(current / ZOOM_FACTOR, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    historyRef.current = [];
    historyIndexRef.current = 0;
    syncHistoryControls();
    scheduleRender();
  }, [scheduleRender, syncHistoryControls]);

  const exportMaskDataUrl = useCallback((): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    // Export as strict black background + white mask (typical inpainting convention).
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;

    // Convert alpha-only strokes into a binary black/white image:
    // - alpha > 0 => white
    // - else => black
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const out = ctx.createImageData(maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < out.data.length; i += 4) {
      const isMasked = maskData.data[i + 3] > 0;
      const value = isMasked ? 255 : 0;
      out.data[i] = value;
      out.data[i + 1] = value;
      out.data[i + 2] = value;
      out.data[i + 3] = 255;
    }

    ctx.putImageData(out, 0, 0);

    return exportCanvas.toDataURL('image/png');
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      exportMaskDataUrl,
      clearMask,
    }),
    [clearMask, exportMaskDataUrl]
  );

  // Load base image and initialize mask canvas for it.
  useEffect(() => {
    const img = new window.Image();
    img.decoding = 'async';
    img.src = imageSrc;

    img.onload = () => {
      baseImageRef.current = img;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.naturalWidth || img.width;
      maskCanvas.height = img.naturalHeight || img.height;
      maskCanvasRef.current = maskCanvas;

      // Ensure we have a stage size recorded even if ResizeObserver fired before the image loaded.
      const stageNode = stageRef.current;
      const rect = stageNode?.getBoundingClientRect();
      if (rect) {
        viewRef.current.stageWidth = Math.max(1, Math.floor(rect.width));
        viewRef.current.stageHeight = Math.max(1, Math.floor(rect.height));
      }

      // Reset view to a centered fit for the new image.
      setZoom(1);
      setShowBrushSettings(false);
      recalcView({
        resetCenter: true,
        zoom: 1,
        stageWidth: viewRef.current.stageWidth,
        stageHeight: viewRef.current.stageHeight,
      });

      // Reset history for the new image (no strokes applied yet).
      historyRef.current = [];
      historyIndexRef.current = 0;
      activeStrokeRef.current = null;
      syncHistoryControls();
      scheduleRender();
    };

    img.onerror = () => {
      baseImageRef.current = null;
      maskCanvasRef.current = null;
    };

    return () => {
      baseImageRef.current = null;
      maskCanvasRef.current = null;
    };
  }, [imageSrc, recalcView, scheduleRender, syncHistoryControls]);

  // Track stage size via ResizeObserver.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      const nextWidth = Math.max(1, Math.floor(width));
      const nextHeight = Math.max(1, Math.floor(height));
      if (nextWidth === viewRef.current.stageWidth && nextHeight === viewRef.current.stageHeight) return;

      // Always record stage size; the base image may not have loaded yet.
      viewRef.current.stageWidth = nextWidth;
      viewRef.current.stageHeight = nextHeight;

      if (baseImageRef.current) {
        recalcView({ stageWidth: nextWidth, stageHeight: nextHeight });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [recalcView]);

  // Apply zoom changes to the view model.
  useEffect(() => {
    viewRef.current.zoom = zoom;
    recalcView({ zoom });
  }, [recalcView, zoom]);

  // Keyboard shortcuts (Win/Linux: Ctrl+Z / Ctrl+Shift+Z, macOS: Cmd+Z / Cmd+Shift+Z)
  // We ignore key events coming from text inputs so we don't break prompt editing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;

      if (event.key.toLowerCase() !== 'z') return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      scheduleRender();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, scheduleRender, undo]);

  // Ensure rAF doesn't leak.
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) window.cancelAnimationFrame(rafIdRef.current);
      if (cursorRafIdRef.current != null) window.cancelAnimationFrame(cursorRafIdRef.current);
    };
  }, []);

  return (
    <div className={cn('mask-editor', className)}>
      <div className="mask-editor-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="mask-editor-canvas"
          style={{ cursor }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerInteraction}
          onPointerCancel={endPointerInteraction}
          onPointerEnter={(event) => {
            updateCursorFromPointerEvent(event, { visible: tool === 'brush' || tool === 'eraser' });
          }}
          onPointerLeave={(event) => {
            updateCursorFromPointerEvent(event, { visible: false });
            endPointerInteraction(event);
          }}
          tabIndex={0}
          aria-label="Mask editor canvas"
        />

        {(tool === 'brush' || tool === 'eraser') && (
          <div
            ref={cursorIndicatorRef}
            className={cn('mask-editor-cursor', tool === 'eraser' && 'mask-editor-cursor-eraser')}
            style={{ width: brushSize, height: brushSize }}
            aria-hidden="true"
          />
        )}

        <div className="mask-editor-toolbar" aria-label="Mask editor tools">
          <button
            className={cn('mask-editor-tool-btn', tool === 'pan' && 'mask-editor-tool-btn-active')}
            onClick={() => setTool('pan')}
            aria-label="Pan tool"
            aria-pressed={tool === 'pan'}
            type="button"
          >
            <MousePointer2 className="mask-editor-tool-icon" />
          </button>

          <button
            className={cn('mask-editor-tool-btn', tool === 'brush' && 'mask-editor-tool-btn-active')}
            onClick={() => setTool('brush')}
            aria-label="Brush tool"
            aria-pressed={tool === 'brush'}
            type="button"
          >
            <Brush className="mask-editor-tool-icon" />
          </button>

          <button
            className={cn('mask-editor-tool-btn', tool === 'eraser' && 'mask-editor-tool-btn-active')}
            onClick={() => setTool('eraser')}
            aria-label="Eraser tool"
            aria-pressed={tool === 'eraser'}
            type="button"
          >
            <Eraser className="mask-editor-tool-icon" />
          </button>

          <div className="mask-editor-toolbar-divider" aria-hidden="true" />

          <div className="mask-editor-brush-settings">
            <button
              className={cn('mask-editor-tool-btn', showBrushSettings && 'mask-editor-tool-btn-active')}
              onClick={() => setShowBrushSettings((open) => !open)}
              aria-label="Brush thickness"
              type="button"
            >
              <SlidersHorizontal className="mask-editor-tool-icon" />
            </button>

            {showBrushSettings && (
              <div className="mask-editor-popover" role="dialog" aria-label="Brush thickness settings">
                <div className="mask-editor-popover-title">Thickness</div>
                <input
                  type="range"
                  min={MIN_BRUSH_SIZE}
                  max={MAX_BRUSH_SIZE}
                  step={1}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="mask-editor-range"
                  aria-label="Brush thickness"
                />
                <div className="mask-editor-popover-value">{brushSize}px</div>
              </div>
            )}
          </div>

          <div className="mask-editor-toolbar-divider" aria-hidden="true" />

          <button
            className="mask-editor-tool-btn"
            onClick={zoomIn}
            aria-label="Zoom in"
            type="button"
          >
            <ZoomIn className="mask-editor-tool-icon" />
          </button>
          <button
            className="mask-editor-tool-btn"
            onClick={zoomOut}
            aria-label="Zoom out"
            type="button"
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="mask-editor-tool-icon" />
          </button>
        </div>

        <div className="mask-editor-history-bar" aria-label="Undo/redo">
          <button
            className="mask-editor-tool-btn"
            onClick={() => {
              undo();
              scheduleRender();
            }}
            aria-label="Undo"
            type="button"
            disabled={!canUndo}
          >
            <Undo2 className="mask-editor-tool-icon" />
          </button>
          <button
            className="mask-editor-tool-btn"
            onClick={() => {
              redo();
              scheduleRender();
            }}
            aria-label="Redo"
            type="button"
            disabled={!canRedo}
          >
            <Redo2 className="mask-editor-tool-icon" />
          </button>
        </div>
      </div>
    </div>
  );
});
