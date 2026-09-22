'use client';

import { useCallback, useState, useRef, useMemo, memo } from 'react';
import { Upload, Download, Loader2, X, ImageIcon, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/hooks/useApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 50;

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

export default function ClothSwapPlayground() {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothImage, setClothImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => !!(personImage && clothImage), [personImage, clothImage]);

  const handleFileSelect = useCallback(
    (setter: (v: string | null) => void) => async (file: File) => {
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
        setter(e.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const clearAll = useCallback(() => {
    setPersonImage(null);
    setClothImage(null);
    setPrompt('');
    setResultImage(null);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setIsProcessing(true);
    setError(null);

    try {
      // image1 = clothing reference, image2 = person (matches the default prompt order)
      const result = await apiFetch<{ success: boolean; imageUrl: string }>(
        '/api/ai/cloth-swap',
        {
          method: 'POST',
          body: {
            image1: clothImage,
            image2: personImage,
            ...(prompt.trim() && { prompt: prompt.trim() }),
          },
        }
      );

      if (!result.success || !result.imageUrl) {
        throw new Error('No image returned from API');
      }

      setResultImage(result.imageUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [canGenerate, clothImage, personImage, prompt]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `cloth-swap-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultImage]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* Left Panel - Inputs */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Cloth Swap Settings</span>
          {(personImage || clothImage) && (
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

        <div className="space-y-4">
          <ImageUpload
            label="Person Image"
            tooltip="Upload an image of the person whose outfit you want to change"
            image={personImage}
            onSelect={handleFileSelect(setPersonImage)}
            onClear={() => { setPersonImage(null); setResultImage(null); }}
            disabled={isProcessing}
          />
          <ImageUpload
            label="Clothing Reference"
            tooltip="Upload an image of the clothing or outfit to swap onto the person"
            image={clothImage}
            onSelect={handleFileSelect(setClothImage)}
            onClear={() => { setClothImage(null); setResultImage(null); }}
            disabled={isProcessing}
          />
        </div>

        {/* Optional Prompt */}
        <div className="mt-4 space-y-2">
          <label htmlFor="cloth-swap-prompt" className="text-sm font-medium text-white">
            Prompt <span className="text-xs font-normal text-text-muted">(optional)</span>
          </label>
          <textarea
            id="cloth-swap-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isProcessing}
            placeholder="Describe how you want the clothing to look… leave empty for default"
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-text-muted/50 outline-none transition focus:border-pink-500/50 disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

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
              Swap Clothes
              <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {GENERATION_COST}+
                <span className="text-yellow-400">&#9672;</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Right Panel - Result */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
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

        <div className="flex flex-1 items-center justify-center">
          {resultImage ? (
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImage}
                alt="Cloth swap result"
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
                  Upload a person image and clothing reference, then click Swap Clothes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
