'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, Download, Loader2, X, Video, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/hooks/useApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const GENERATION_COST = 70;
const MAX_PROMPT_LENGTH = 300;

// ============================================================================
// Main Component
// ============================================================================

export default function AIStripePlayground() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please upload a valid image (PNG, JPG, or WebP)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Image too large. Maximum size is 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setResultVideo(null);
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

  // ── Clear ──

  const handleClear = useCallback(() => {
    setUploadedImage(null);
    setPrompt('');
    setResultVideo(null);
    setError(null);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Generate — calls /api/ai/stripe-video with polling fallback ──

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage) {
      setError('Please upload an image');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultVideo(null);
    setProgress('Generating stripe video...');

    try {
      // Send base64 data URI directly — API route handles upload to ModelsLab
      type StripeResponse = {
        success: boolean;
        videoUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<StripeResponse>('/api/ai/stripe-video', {
        method: 'POST',
        body: {
          imageUrl: uploadedImage,
          prompt: prompt.trim() || undefined,
        },
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
        setProgress('Generating video — this may take a few minutes...');

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
              throw new Error(jobResponse.job.errorMessage || 'Stripe video generation failed');
            }

            // Update progress with elapsed time
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

        throw new Error('Stripe video generation timed out. Please try again.');
      }

      throw new Error(result.error || 'Failed to generate stripe video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate. Please try again.');
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, prompt]);

  // ── Download ──

  const handleDownload = useCallback(async () => {
    if (!resultVideo) return;
    try {
      const res = await fetch(resultVideo);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-stripe-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(resultVideo, '_blank');
    }
  }, [resultVideo]);

  // ── Render ──

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* Left Panel */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white">Upload Image</span>
            <span className="text-pink-500">*</span>
          </div>
          {uploadedImage && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white"
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

        {/* Upload Area */}
        <div className="mb-4">
          {!uploadedImage ? (
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
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex h-[240px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-all',
                isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-white/20 hover:border-white/40'
              )}
            >
              <Upload className={cn('h-8 w-8', isDragging ? 'text-pink-400' : 'text-text-muted')} />
              <span className="text-sm text-text-muted">Click or drag image to upload</span>
            </div>
          ) : (
            <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage} alt="Uploaded" className="max-h-[300px] max-w-full object-contain" />
            </div>
          )}
        </div>

        {/* Optional Prompt */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
            Prompt
            <span className="text-xs font-normal text-text-muted">(Optional)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe any specific style or effect you want..."
            rows={2}
            maxLength={MAX_PROMPT_LENGTH}
            disabled={isProcessing}
            className={cn(
              'w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-text-muted transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
              isProcessing && 'cursor-not-allowed opacity-50'
            )}
          />
          <div className="mt-1 text-right text-xs text-text-muted">
            {prompt.length}/{MAX_PROMPT_LENGTH}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span className="text-sm text-purple-300">{progress}</span>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!uploadedImage || isProcessing}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
            !uploadedImage || isProcessing
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
              Generate
              <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {GENERATION_COST}+
                <span className="text-yellow-400">&#9672;</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Right Panel - Video Result */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">Result</span>
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
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Video className="h-7 w-7 text-text-muted" />
              </div>
              <div>
                <p className="font-medium text-text-muted">No result yet</p>
                <p className="mt-1 text-sm text-text-muted/70">Your generated video will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="rounded-xl border border-white/10 bg-[var(--bg-secondary)] p-4 lg:col-span-2">
        <p className="text-xs font-medium text-white/80">Tips for best results</p>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
          <li>• Use clear, well-lit images</li>
          <li>• Front-facing photos work best</li>
          <li>• Add a prompt for custom effects</li>
        </ul>
      </div>
    </div>
  );
}
