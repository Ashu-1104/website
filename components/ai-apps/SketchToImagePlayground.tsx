'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Upload, Download, Loader2, X, ImageIcon, Sparkles, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, getUserId } from '@/hooks/useApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB max file size
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 60; // Token cost for generation
const MAX_PROMPT_LENGTH = 500;

// ============================================================================
// Main Component
// ============================================================================

export default function SketchToImagePlayground() {
  // ─────────────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────────────

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // File Validation & Processing
  // ─────────────────────────────────────────────────────────────────────────

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
    if (!uploadedImage || !uploadedFile || !prompt.trim()) {
      setError('Please upload a sketch and describe the image you want');
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

      type EditApiResponse = {
        success: boolean;
        imageUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<EditApiResponse>('/api/ai/image/edit', {
        method: 'POST',
        body: {
          imageUrl: uploadData.url,
          prompt: `Transform this sketch into a realistic, detailed image: ${prompt.trim()}`,
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
        await new Promise((resolve) => setTimeout(resolve, 30_000));

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
              throw new Error(jobResponse.job.errorMessage || 'Image generation failed');
            }
          } catch (pollError) {
            if (pollError instanceof Error && (pollError.message.includes('failed') || pollError.message.includes('timed out'))) throw pollError;
          }
          await new Promise((resolve) => setTimeout(resolve, 5_000));
        }
        throw new Error('Image generation timed out');
      }

      throw new Error(result.error || 'Failed to generate image');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, uploadedFile, prompt]);

  const handleClear = useCallback(() => {
    setUploadedImage(null);
    setUploadedFile(null);
    setPrompt('');
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
      a.download = `sketch-to-image-${Date.now()}.png`;
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
      {/* Left Panel */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-pink-400" />
            <span className="text-sm font-medium text-white">Your Sketch</span>
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
            e.target.value = '';
          }}
        />

        {/* Upload Area / Image Preview */}
        <div className="mb-4">
          {!uploadedImage ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-all duration-200',
                isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-white/20 hover:border-white/40'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                <Upload className={cn('h-6 w-6 transition-colors', isDragging ? 'text-pink-400' : 'text-text-muted')} />
              </div>
              <div className="text-center">
                <span className="block text-sm text-text-muted">Drop your sketch or click to upload</span>
                <span className="mt-1 block text-xs text-text-muted/60">Hand-drawn or digital sketches</span>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage} alt="Uploaded sketch" className="max-h-[350px] max-w-full object-contain" />
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1 text-sm font-medium text-white">
            Image Description
            <span className="text-pink-500">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the realistic image you want...

Examples:
• A realistic portrait of a woman with blonde hair
• A photorealistic landscape with mountains and lake
• A detailed character in fantasy armor"
            rows={4}
            maxLength={MAX_PROMPT_LENGTH}
            disabled={isProcessing}
            className={cn(
              'w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
              isProcessing && 'cursor-not-allowed opacity-50'
            )}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-text-muted">Be detailed for best results</span>
            <span
              className={cn(
                'text-text-muted',
                prompt.length > MAX_PROMPT_LENGTH * 0.9 && 'text-yellow-400',
                prompt.length === MAX_PROMPT_LENGTH && 'text-red-400'
              )}
            >
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!uploadedImage || !prompt.trim() || isProcessing}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200',
            !uploadedImage || !prompt.trim() || isProcessing
              ? 'cursor-not-allowed bg-white/10 opacity-50'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate Image</span>
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
          <span className="text-sm font-medium text-white">Generated Image</span>
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
              <p className="text-sm text-text-muted">Generating image, please wait...</p>
              <p className="text-xs text-text-muted/60">This may take up to a minute</p>
            </div>
          ) : resultImage ? (
            <div
              className="w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/20"
              onClick={() => setLightboxImage(resultImage)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultImage}
                alt="Generated image result"
                className="max-h-[450px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                  <ImageIcon className="h-8 w-8 text-text-muted" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-secondary)] ring-2 ring-[var(--bg-secondary)]">
                  <Pencil className="h-3 w-3 text-pink-400" />
                </div>
              </div>
              <div>
                <p className="font-medium text-text-muted">Ready to transform your sketch</p>
                <p className="mt-1 max-w-[220px] text-sm text-text-muted/70">
                  Upload a sketch and describe the image you want to create
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Tips Section - Below the panels */}
      {/* ================================================================== */}
      <div className="rounded-xl border border-white/10 bg-[var(--bg-secondary)] p-4 lg:col-span-2">
        <p className="text-xs font-medium text-white/80">Tips for best results</p>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
          <li>• Use clear, well-defined lines in your sketch</li>
          <li>• Describe colors, textures, and lighting in your prompt</li>
          <li>• Simple sketches with good contrast work best</li>
        </ul>
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
