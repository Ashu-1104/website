'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Download, Loader2, X, ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, getUserId } from '@/hooks/useApi';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 40;

export default function BackgroundRemoverPlayground() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, or WebP)');
      return;
    }
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // ── Generate ──

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !uploadedFile) return;

    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    try {
      // 1. Upload image to get a URL
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

      // 2. Call background removal endpoint
      type BgRemoveResponse = {
        success: boolean;
        imageUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<BgRemoveResponse>('/api/ai/background-remover', {
        method: 'POST',
        body: { imageUrl: uploadData.url },
      });

      if (result.status === 'success' && result.imageUrl) {
        setResultImage(result.imageUrl);
        setIsProcessing(false);
        return;
      }

      // Handle async job polling
      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const startedAt = Date.now();
        const initialDelayMs = 15_000;
        const pollIntervalMs = 5_000;
        const maxTotalMs = 5 * 60_000;

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
              throw new Error(jobResponse.job.errorMessage || 'Background removal failed');
            }
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

        throw new Error('Background removal timed out');
      }

      throw new Error(result.error || 'Failed to remove background');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, uploadedFile]);

  // ── Actions ──

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
      a.download = `background-removed-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  // Close lightbox on ESC
  useEffect(() => {
    if (!lightboxImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightboxImage]);

  // ── Render ──

  return (
    <>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Left Panel - Image Upload & Generate */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
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

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />

          <div className="flex-1">
            {!uploadedImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex h-full min-h-[60vh] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-all duration-200',
                  isDragging
                    ? 'border-pink-500 bg-pink-500/5'
                    : 'border-white/20 hover:border-white/40',
                )}
              >
                <Upload
                  className={cn(
                    'h-8 w-8 transition-colors',
                    isDragging ? 'text-pink-400' : 'text-text-muted',
                  )}
                />
                <span className="text-sm text-text-muted">Click to upload or drag & drop</span>
              </div>
            ) : (
              <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage}
                  alt="Uploaded image"
                  className="max-h-[400px] max-w-full object-contain"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!uploadedImage || isProcessing}
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200',
              !uploadedImage || isProcessing
                ? 'cursor-not-allowed bg-white/10 opacity-50'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20',
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Removing Background...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Remove Background</span>
                <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {GENERATION_COST}+
                  <span className="text-yellow-400">&#9672;</span>
                </span>
              </>
            )}
          </button>
        </div>

        {/* Right Panel - Results */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
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

          <div className="flex flex-1 items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-pink-400" />
                <p className="text-sm text-text-muted">Removing background, please wait...</p>
                <p className="text-xs text-text-muted/60">This may take up to a minute</p>
              </div>
            ) : resultImage ? (
              <div
                className="relative flex min-h-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#222_0%_25%,#333_0%_50%)] bg-[length:16px_16px]"
                onClick={() => setLightboxImage(resultImage)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultImage}
                  alt="Result with background removed"
                  className="max-h-[500px] max-w-full object-contain"
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
                    Upload an image and click Remove Background
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="chat-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightboxImage(null)}
        >
          <div className="chat-lightbox-actions">
            <button
              type="button"
              className="chat-lightbox-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(lightboxImage);
              }}
              aria-label="Download image"
            >
              <Download className="chat-lightbox-action-icon" />
            </button>
            <button
              type="button"
              className="chat-lightbox-action-btn"
              onClick={() => setLightboxImage(null)}
              aria-label="Close"
            >
              <X className="chat-lightbox-action-icon" />
            </button>
          </div>
          <div className="chat-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Full size preview"
              className="chat-lightbox-image"
            />
          </div>
        </div>
      )}
    </>
  );
}
