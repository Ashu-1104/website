'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ImageIcon, Info, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, getUserId } from '@/hooks/useApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB max file size
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 40; // Token cost for generation

type UpscaleMode = 'upscale' | 'enhance';
type UpscaleFactor = '2x' | '3x' | '4x';

const UPSCALE_MODE_LABEL: Record<UpscaleMode, string> = {
  upscale: 'Image Upscale',
  enhance: 'Enhance Image',
};

const UPSCALE_FACTOR_OPTIONS: UpscaleFactor[] = ['2x', '3x', '4x'];

// ============================================================================
// Main Component
// ============================================================================

export default function AIImageUpscalePlayground() {
  // ─────────────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────────────

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<UpscaleMode>('upscale');
  const [factor, setFactor] = useState<UpscaleFactor>('2x');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // File Validation & Processing
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validates and processes the selected file
   * - Checks file type and size
   * - Reads file as data URL for preview
   */
  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 8MB.');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Drag & Drop Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !uploadedFile) {
      setError('Please upload an image');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const uploadRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-vp-user-id': getUserId() },
        body: formData,
      });

      const uploadData = (await uploadRes.json()) as { url?: string; error?: string };
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Failed to upload image');
      }

      type UpscaleApiResponse = {
        success: boolean;
        imageUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const scaleNumber = factor.replace('x', '');

      const result = await apiFetch<UpscaleApiResponse>('/api/ai/image-upscale', {
        method: 'POST',
        body: {
          imageUrl: uploadData.url,
          scale: scaleNumber,
          mode,
        },
      });

      if (result.status === 'success' && result.imageUrl) {
        setResultImage(result.imageUrl);
        setIsProcessing(false);
        return;
      }

      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const startedAt = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 15_000));

        while (Date.now() - startedAt < 5 * 60_000) {
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
              throw new Error(jobResponse.job.errorMessage || 'Image upscale failed');
            }
          } catch (pollError) {
            if (pollError instanceof Error && (pollError.message.includes('failed') || pollError.message.includes('timed out'))) throw pollError;
          }
          await new Promise((resolve) => setTimeout(resolve, 5_000));
        }
        throw new Error('Image upscale timed out');
      }

      throw new Error(result.error || 'Failed to upscale image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [factor, mode, uploadedImage, uploadedFile]);

  const handleClear = useCallback(() => {
    setUploadedImage(null);
    setUploadedFile(null);
    setResultImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDownload = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-upscaled-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  useEffect(() => {
    if (!lightboxImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightboxImage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* ================================================================== */}
      {/* Left Panel - Image Upload, Options & Generate */}
      {/* ================================================================== */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Panel Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white">Base Image</span>
            <span className="text-pink-500">*</span>
          </div>
          {uploadedImage && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
              aria-label="Clear image"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = ''; // Reset to allow re-uploading same file
          }}
        />

        {/* Upload Area / Image Preview */}
        <div className="mb-4">
          {!uploadedImage ? (
            // Empty State - Upload Dropzone
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex h-[310px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-all duration-200',
                isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-white/20 hover:border-white/40'
              )}
            >
              <Upload className={cn('h-8 w-8 transition-colors', isDragging ? 'text-pink-400' : 'text-text-muted')} />
              <span className="text-sm text-text-muted">Click to upload or select image</span>
            </div>
          ) : (
            // Image Preview - Responsive to image dimensions
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {/* Using native img for better responsive sizing */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage} alt="Uploaded image" className="max-h-[400px] max-w-full object-contain" />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex h-7 items-center gap-2">
              <label className="text-sm font-medium text-white" htmlFor="ai-image-upscale-tool">
                Tool
              </label>
              <button
                type="button"
                className="chat-details-tooltip"
                aria-label="Tool info"
                data-tooltip="Image Upscale will enlarge your image. Enhance Image will add details to your image."
              >
                <Info className="chat-details-tooltip-icon" />
              </button>
            </div>
            <select
              id="ai-image-upscale-tool"
              value={mode}
              onChange={(e) => setMode(e.target.value as UpscaleMode)}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
              disabled={isProcessing}
            >
              <option value="upscale">{UPSCALE_MODE_LABEL.upscale}</option>
              <option value="enhance">{UPSCALE_MODE_LABEL.enhance}</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex h-7 items-center">
              <label className="text-sm font-medium text-white" htmlFor="ai-image-upscale-factor">
                Upscale Factor
              </label>
            </div>
            <select
              id="ai-image-upscale-factor"
              value={factor}
              onChange={(e) => setFactor(e.target.value as UpscaleFactor)}
              className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-accent-pink/40 focus:outline-none focus:ring-2 focus:ring-accent-pink/20"
              disabled={isProcessing}
            >
              {UPSCALE_FACTOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Generate Button - Always visible at bottom */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!uploadedImage || isProcessing}
          className={cn(
            'mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200',
            !uploadedImage || isProcessing
              ? 'cursor-not-allowed bg-white/10 opacity-50'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate</span>
              <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {GENERATION_COST}+
                <span className="text-yellow-400">&#9672;</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* ================================================================== */}
      {/* Right Panel - Results Display */}
      {/* ================================================================== */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Panel Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Result</span>
          {resultImage && (
            <button
              type="button"
              onClick={() => handleDownload(resultImage)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="flex flex-1 items-center justify-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
              <p className="text-sm text-text-muted">Upscaling, please wait...</p>
              <p className="text-xs text-text-muted/60">This may take up to a minute</p>
            </div>
          ) : resultImage ? (
            // Result Image Display
            <div
              className="relative flex min-h-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20"
              onClick={() => setLightboxImage(resultImage)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImage}
                alt={`${UPSCALE_MODE_LABEL[mode]} result (${factor})`}
                className="max-h-[400px] max-w-full object-contain"
              />
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <ImageIcon className="h-7 w-7 text-text-muted" />
              </div>
              <div>
                <p className="font-medium text-text-muted">No creations yet</p>
                <p className="mt-1 text-sm text-text-muted/70">Your generated images will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {lightboxImage && (
      <div className="chat-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setLightboxImage(null)}>
        <div className="chat-lightbox-actions">
          <button type="button" className="chat-lightbox-action-btn" onClick={(e) => { e.stopPropagation(); handleDownload(lightboxImage); }} aria-label="Download image">
            <Download className="chat-lightbox-action-icon" />
          </button>
          <button type="button" className="chat-lightbox-action-btn" onClick={() => setLightboxImage(null)} aria-label="Close">
            <X className="chat-lightbox-action-icon" />
          </button>
        </div>
        <div className="chat-lightbox-content" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImage} alt="Full size preview" className="chat-lightbox-image" />
        </div>
      </div>
    )}
    </>
  );
}
