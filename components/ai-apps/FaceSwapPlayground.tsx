'use client';

import { useCallback, useState, useRef, useMemo, memo } from 'react';
import { Upload, Download, Loader2, X, ImageIcon, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, getUserId } from '@/hooks/useApi';

// ============================================================================
// Types
// ============================================================================

type SwapMode = 'single' | 'multi';

interface ImageUploadState {
  sourceImage: string | null;
  referenceImage: string | null;
  targetImage: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 50;

const MODE_CONFIG = {
  single: {
    label: 'Single Face Swap',
    description: 'Swap face when there is only one person in the input image',
  },
  multi: {
    label: 'Multi-Face Swap',
    description: 'For group photos where you choose which face to swap',
  },
} as const;

// ============================================================================
// Tooltip Component
// ============================================================================

const Tooltip = memo(function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 cursor-help text-text-muted transition-colors hover:text-white" />
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="w-48 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-xs text-white shadow-xl">
          {text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1a1a2e]" />
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Image Upload Component
// ============================================================================

interface ImageUploadProps {
  label: string;
  tooltip?: string;
  image: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

const ImageUpload = memo(function ImageUpload({
  label,
  tooltip,
  image,
  onSelect,
  onClear,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onSelect(file);
    },
    [disabled, onSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-2">
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-pink-500">*</span>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        {image && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Hidden Input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
        disabled={disabled}
      />

      {/* Upload Area */}
      {!image ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all',
            isDragging
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Upload className={cn('h-6 w-6', isDragging ? 'text-pink-400' : 'text-text-muted')} />
          <span className="text-xs text-text-muted">Click or drag image to upload</span>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={label}
            className="h-40 w-full object-contain"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export default function FaceSwapPlayground() {
  // State
  const [mode, setMode] = useState<SwapMode>('single');
  const [images, setImages] = useState<ImageUploadState>({
    sourceImage: null,
    referenceImage: null,
    targetImage: null,
  });
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const canGenerate = useMemo(() => {
    if (mode === 'single') {
      return !!(images.sourceImage && images.targetImage);
    }
    return !!(images.sourceImage && images.referenceImage && images.targetImage);
  }, [mode, images]);

  // File handler
  const handleFileSelect = useCallback(
    (key: keyof ImageUploadState) => async (file: File) => {
      setError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Please upload PNG, JPG, or WebP image');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => ({ ...prev, [key]: e.target?.result as string }));
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Clear handlers
  const clearImage = useCallback((key: keyof ImageUploadState) => () => {
    setImages((prev) => ({ ...prev, [key]: null }));
    setResultImage(null);
  }, []);

  const clearAll = useCallback(() => {
    setImages({ sourceImage: null, referenceImage: null, targetImage: null });
    setResultImage(null);
    setError(null);
  }, []);

  // Mode change
  const handleModeChange = useCallback((newMode: SwapMode) => {
    setMode(newMode);
    setResultImage(null);
    setError(null);
  }, []);

  // Generate — calls /api/ai/face-swap with webhook + polling fallback
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Build request body with base64 images
      const body: Record<string, unknown> = {
        mode,
        initImage: images.sourceImage,
        targetImage: images.targetImage,
      };

      // Multi mode needs the reference image
      if (mode === 'multi' && images.referenceImage) {
        body.referenceImage = images.referenceImage;
      }

      // 1. Call face swap API
      type FaceSwapResponse = {
        success: boolean;
        imageUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<FaceSwapResponse>('/api/ai/face-swap', {
        method: 'POST',
        body,
      });

      // Immediate success — image returned directly
      if (result.status === 'success' && result.imageUrl) {
        setResultImage(result.imageUrl);
        setIsProcessing(false);
        return;
      }

      // 2. Async processing — poll job status until complete
      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const startedAt = Date.now();
        const initialDelayMs = 10_000;
        const pollIntervalMs = 5_000;
        const maxTotalMs = 5 * 60_000; // 5 min timeout

        await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

        while (Date.now() - startedAt < maxTotalMs) {
          try {
            const jobResponse = await apiFetch<{
              success: boolean;
              job: { status: string; resultUrl?: string; errorMessage?: string };
            }>(`/api/jobs/${jobId}`);

            if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
              setResultImage(jobResponse.job.resultUrl);
              setIsProcessing(false);
              return;
            }

            if (jobResponse.job.status === 'FAILED') {
              throw new Error(jobResponse.job.errorMessage || 'Face swap failed');
            }
          } catch (pollError) {
            // Re-throw terminal errors, ignore transient ones
            if (
              pollError instanceof Error &&
              (pollError.message.includes('failed') || pollError.message.includes('timed out'))
            ) {
              throw pollError;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error('Face swap timed out. Please try again.');
      }

      throw new Error(result.error || 'Failed to process face swap');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [canGenerate, mode, images]);

  // Download — handles both remote URLs and data URIs
  const handleDownload = useCallback(async () => {
    if (!resultImage) return;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `face-swap-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(resultImage, '_blank');
    }
  }, [resultImage]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* ================================================================ */}
      {/* Left Panel - Inputs */}
      {/* ================================================================ */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Face Swap Settings</span>
          {(images.sourceImage || images.referenceImage || images.targetImage) && (
            <button
              type="button"
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
        </div>

        {/* Mode Toggle - Full Width Pill Style */}
        <div className="mb-5">
          <div className="flex w-full rounded-xl bg-[#1a1a2e] p-1">
            {(Object.keys(MODE_CONFIG) as SwapMode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleModeChange(key)}
                disabled={isProcessing}
                className={cn(
                  'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200',
                  mode === key
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                    : 'text-text-muted hover:text-white',
                  isProcessing && 'cursor-not-allowed opacity-50'
                )}
              >
                {MODE_CONFIG[key].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">{MODE_CONFIG[mode].description}</p>
        </div>

        {/* Image Uploads - Stacked Vertically */}
        <div className="space-y-4">
          {mode === 'single' ? (
            <>
              <ImageUpload
                label="Source Face"
                tooltip="Upload an image containing the face you want to use"
                image={images.sourceImage}
                onSelect={handleFileSelect('sourceImage')}
                onClear={clearImage('sourceImage')}
                disabled={isProcessing}
              />
              <ImageUpload
                label="Target Image"
                tooltip="Upload the image where the face will be swapped"
                image={images.targetImage}
                onSelect={handleFileSelect('targetImage')}
                onClear={clearImage('targetImage')}
                disabled={isProcessing}
              />
            </>
          ) : (
            <>
              <ImageUpload
                label="Source Image"
                tooltip="Upload a group photo with multiple faces"
                image={images.sourceImage}
                onSelect={handleFileSelect('sourceImage')}
                onClear={clearImage('sourceImage')}
                disabled={isProcessing}
              />
              <ImageUpload
                label="Reference Face"
                tooltip="Upload a reference image to identify which face to swap from the source"
                image={images.referenceImage}
                onSelect={handleFileSelect('referenceImage')}
                onClear={clearImage('referenceImage')}
                disabled={isProcessing}
              />
              <ImageUpload
                label="Target Face"
                tooltip="Upload the new face to swap in"
                image={images.targetImage}
                onSelect={handleFileSelect('targetImage')}
                onClear={clearImage('targetImage')}
                disabled={isProcessing}
              />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || isProcessing}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
            !canGenerate || isProcessing
              ? 'cursor-not-allowed bg-white/10 opacity-50'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Swap Face
              <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {GENERATION_COST}+
                <span className="text-yellow-400">&#9672;</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* ================================================================ */}
      {/* Right Panel - Result */}
      {/* ================================================================ */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Result</span>
          {resultImage && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}
        </div>

        {/* Result Area */}
        <div className="flex flex-1 items-center justify-center">
          {resultImage ? (
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImage}
                alt="Face swap result"
                className="max-h-[450px] w-full object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <ImageIcon className="h-7 w-7 text-text-muted" />
              </div>
              <div>
                <p className="font-medium text-text-muted">No result yet</p>
                <p className="mt-1 text-sm text-text-muted/70">
                  Upload images and click Swap Face
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
