'use client';

import { useCallback, useState, useRef, useMemo, memo } from 'react';
import { Upload, Download, Loader2, X, Video, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/hooks/useApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 80;

// ============================================================================
// Image Upload Component
// ============================================================================

interface ImageUploadProps {
  label: string;
  sublabel?: string;
  image: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

const ImageUpload = memo(function ImageUpload({
  label,
  sublabel,
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

  return (
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white">{label}</span>
            <span className="text-pink-500">*</span>
          </div>
          {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
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
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all',
            isDragging
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Upload className={cn('h-6 w-6', isDragging ? 'text-pink-400' : 'text-text-muted')} />
          <span className="text-xs text-text-muted">Click or drag to upload</span>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={label} className="h-48 w-full object-contain" loading="lazy" />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export default function AIKissingVideoPlayground() {
  // State
  const [yourImage, setYourImage] = useState<string | null>(null);
  const [partnerImage, setPartnerImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  // Validation
  const canGenerate = useMemo(() => {
    return !!(yourImage && partnerImage);
  }, [yourImage, partnerImage]);

  // File handler
  const handleFileSelect = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string | null>>) => (file: File) => {
      setError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Please upload a valid image (PNG, JPG, or WebP)');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('Image too large. Maximum size is 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setter(e.target?.result as string);
        setResultVideo(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Clear handlers
  const clearYourImage = useCallback(() => {
    setYourImage(null);
    setResultVideo(null);
  }, []);

  const clearPartnerImage = useCallback(() => {
    setPartnerImage(null);
    setResultVideo(null);
  }, []);

  const clearAll = useCallback(() => {
    setYourImage(null);
    setPartnerImage(null);
    setResultVideo(null);
    setError(null);
    setProgress('');
  }, []);

  // Generate — two-step pipeline: image merge → video generation
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setIsProcessing(true);
    setError(null);
    setResultVideo(null);
    setProgress('Merging images & generating video — this may take several minutes...');

    try {
      // Send base64 data URIs directly — API route handles upload to ModelsLab
      type KissingResponse = {
        success: boolean;
        videoUrl: string | null;
        mergedImageUrl?: string;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<KissingResponse>('/api/ai/kissing-video', {
        method: 'POST',
        body: { image1: yourImage, image2: partnerImage },
      });

      // Immediate success
      if (result.status === 'success' && result.videoUrl) {
        setResultVideo(result.videoUrl);
        setProgress('');
        setIsProcessing(false);
        return;
      }

      // 3. Async processing — poll job status
      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const startedAt = Date.now();
        const initialDelayMs = 10_000;
        const pollIntervalMs = 5_000;
        const maxTotalMs = 10 * 60_000; // 10 min timeout

        await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

        while (Date.now() - startedAt < maxTotalMs) {
          try {
            const jobResponse = await apiFetch<{
              success: boolean;
              job: { status: string; resultUrl?: string; errorMessage?: string };
            }>(`/api/jobs/${jobId}`);

            if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
              setResultVideo(jobResponse.job.resultUrl);
              setProgress('');
              setIsProcessing(false);
              return;
            }

            if (jobResponse.job.status === 'FAILED') {
              throw new Error(jobResponse.job.errorMessage || 'Kissing video generation failed');
            }

            const elapsed = Math.round((Date.now() - startedAt) / 1000);
            setProgress(`Generating video — ${elapsed}s elapsed...`);
          } catch (pollError) {
            if (
              pollError instanceof Error &&
              (pollError.message.includes('failed') || pollError.message.includes('timed out'))
            ) {
              throw pollError;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error('Video generation timed out. Please try again.');
      }

      throw new Error(result.error || 'Failed to generate kissing video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video. Please try again.');
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  }, [canGenerate, yourImage, partnerImage]);

  // Download — handles remote URLs
  const handleDownload = useCallback(async () => {
    if (!resultVideo) return;
    try {
      const res = await fetch(resultVideo);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `kissing-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(resultVideo, '_blank');
    }
  }, [resultVideo]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* ================================================================ */}
      {/* Left Panel - Inputs */}
      {/* ================================================================ */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-400" />
            <span className="text-sm font-medium text-white">Create Kissing Video</span>
          </div>
          {(yourImage || partnerImage) && (
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

        {/* Image Uploads - Side by Side */}
        <div className="mb-4 flex gap-4">
          <ImageUpload
            label="Your Image"
            sublabel="Upload your photo"
            image={yourImage}
            onSelect={handleFileSelect(setYourImage)}
            onClear={clearYourImage}
            disabled={isProcessing}
          />
          <ImageUpload
            label="Partner Image"
            sublabel="Who you want to kiss"
            image={partnerImage}
            onSelect={handleFileSelect(setPartnerImage)}
            onClear={clearPartnerImage}
            disabled={isProcessing}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mb-4 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
              <span className="text-sm text-pink-300">{progress}</span>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || isProcessing}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
            !canGenerate || isProcessing
              ? 'cursor-not-allowed bg-white/10 opacity-50'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating your moment...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Video
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
          <span className="text-sm font-medium text-white">Generated Video</span>
          {resultVideo && (
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
          {resultVideo ? (
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                src={resultVideo}
                className="max-h-[400px] w-full object-contain"
                controls
                autoPlay
                loop
                preload="metadata"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                  <Video className="h-8 w-8 text-text-muted" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-secondary)] ring-2 ring-[var(--bg-secondary)]">
                  <Heart className="h-3 w-3 text-pink-400" />
                </div>
              </div>
              <div>
                <p className="font-medium text-text-muted">Your video awaits</p>
                <p className="mt-1 max-w-[200px] text-sm text-text-muted/70">
                  Upload two photos and create a romantic moment
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Tips Section - Below the panels */}
      {/* ================================================================ */}
      <div className="rounded-xl border border-white/10 bg-[var(--bg-secondary)] p-4 lg:col-span-2">
        <p className="text-xs font-medium text-white/80">How it works</p>
        <ol className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-xs text-text-muted">
          <li>1. Upload your image</li>
          <li>2. Upload the image of the person you want to kiss</li>
          <li>3. Click Generate Video and watch the magic unfold</li>
        </ol>
      </div>
    </div>
  );
}
