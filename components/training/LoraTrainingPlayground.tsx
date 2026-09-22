'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

const MIN_IMAGES = 15;
const MAX_IMAGES = 50;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per image
const STEPS_PER_IMAGE = 120;
const MIN_STEPS = 1500;
const MAX_STEPS = 6000;

type TrainingStatus = 'idle' | 'uploading' | 'training' | 'polling' | 'completed' | 'failed';

type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function calculateSteps(imageCount: number): number {
  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, STEPS_PER_IMAGE * imageCount));
}

export default function LoraTrainingPlayground() {
  const { userId } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [triggerWord, setTriggerWord] = useState('');
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollMessage, setPollMessage] = useState('');

  const trainingSteps = calculateSteps(images.length);
  const canTrain = images.length >= MIN_IMAGES && triggerWord.trim().length > 0 && status === 'idle';

  const addImages = useCallback((files: FileList | File[]) => {
    const newImages: UploadedImage[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_BYTES) continue;
      if (images.length + newImages.length >= MAX_IMAGES) break;

      newImages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  }, [images.length]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAllImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  }, [images]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  }, [addImages]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files);
      e.target.value = '';
    }
  }, [addImages]);

  const uploadImageToUrl = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'x-vp-user-id': userId },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Failed to upload image');
    }
    return data.url;
  };

  const handleStartTraining = useCallback(async () => {
    if (!canTrain) return;

    setStatus('uploading');
    setErrorMessage('');
    setPollMessage('Uploading images...');

    try {
      // Upload all images and collect URLs
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setPollMessage(`Uploading image ${i + 1} of ${images.length}...`);
        const url = await uploadImageToUrl(images[i]!.file);
        imageUrls.push(url);
      }

      setStatus('training');
      setPollMessage('Starting training...');

      const response = await fetch('/api/ai/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vp-user-id': userId,
        },
        body: JSON.stringify({
          images: imageUrls,
          triggerWord: triggerWord.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Training request failed');
      }

      if (data.job?.id) {
        setJobId(data.job.id);
        setStatus('polling');
        setPollMessage('Training in progress. This may take 15-45 minutes...');

        // Poll for completion
        const pollInterval = 30_000; // 30 seconds
        const maxPollTime = 60 * 60_000; // 60 minutes
        const startedAt = Date.now();

        const poll = async () => {
          while (Date.now() - startedAt < maxPollTime) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));

            try {
              const jobResponse = await fetch(`/api/jobs/${data.job.id}`, {
                headers: { 'x-vp-user-id': userId },
              });
              const jobData = await jobResponse.json();

              if (jobData.job?.status === 'COMPLETED') {
                setStatus('completed');
                setPollMessage('Training completed successfully!');
                return;
              }
              if (jobData.job?.status === 'FAILED') {
                throw new Error(jobData.job.errorMessage || 'Training failed');
              }

              const elapsed = Math.round((Date.now() - startedAt) / 60_000);
              setPollMessage(`Training in progress... (${elapsed} min elapsed)`);
            } catch (pollError) {
              if (pollError instanceof Error && pollError.message.includes('failed')) {
                throw pollError;
              }
              // Network error — keep polling
            }
          }
          throw new Error('Training timed out after 60 minutes');
        };

        poll().catch((err) => {
          setStatus('failed');
          setErrorMessage(err instanceof Error ? err.message : 'Training failed');
          setPollMessage('');
        });
      } else {
        setStatus('completed');
        setPollMessage('Training request submitted successfully!');
      }
    } catch (error) {
      setStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Training failed');
      setPollMessage('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTrain, images, triggerWord, userId]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
    setPollMessage('');
    setJobId(null);
  }, []);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[420px,1fr]">
      {/* ─── Left Column: Controls ─── */}
      <div className="flex flex-col gap-5">

        {/* Image Upload Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Training Images</h3>
            <div className="flex items-center gap-2">
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                images.length >= MIN_IMAGES
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-[var(--text-muted)]'
              )}>
                {images.length}/{MIN_IMAGES} minimum
              </span>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllImages}
                  className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-white/10 hover:text-red-400"
                  aria-label="Clear all images"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Dropzone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all',
              isDragging
                ? 'border-[var(--accent-pink)] bg-[var(--accent-pink)]/10'
                : 'border-white/20 bg-white/5 hover:border-[var(--accent-pink)]/50 hover:bg-white/[0.07]'
            )}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Drag & drop images here, or <span className="text-[var(--accent-pink)]">browse</span>
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              PNG, JPG up to 10MB each. Min {MIN_IMAGES}, max {MAX_IMAGES} images.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Image Thumbnails Grid */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt="Training image"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-[var(--text-muted)] transition hover:border-[var(--accent-pink)]/50 hover:text-[var(--accent-pink)]"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Trigger Word Section */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Trigger Word</h3>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)] shadow-xl">
                  A unique word that activates your LoRA model in prompts. Use something distinctive like &quot;myperson&quot; or &quot;sks&quot;. Include this word in your image prompts to generate images with your trained style.
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--bg-secondary)]" />
                </div>
              )}
            </div>
          </div>
          <input
            type="text"
            value={triggerWord}
            onChange={(e) => setTriggerWord(e.target.value)}
            placeholder="e.g. myperson, sks, mycharacter"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent-pink)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-pink)]/20"
          />
        </div>

        {/* Training Info */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Training Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
              <span className="text-sm text-[var(--text-secondary)]">Training Steps</span>
              <span className="text-sm font-medium text-white">{trainingSteps.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
              <span className="text-sm text-[var(--text-secondary)]">Model</span>
              <span className="text-sm font-medium text-white">Z-Image Turbo</span>
            </div>
          </div>
        </div>

        {/* Start Training Button */}
        <button
          type="button"
          disabled={!canTrain}
          onClick={handleStartTraining}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all',
            canTrain
              ? 'shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'cursor-not-allowed bg-white/10 text-[var(--text-muted)]'
          )}
          style={canTrain ? {
            background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))',
            boxShadow: '0 0 16px rgba(255, 62, 138, 0.3)',
          } : undefined}
        >
          <Zap className="h-4 w-4" />
          Start Training
        </button>
      </div>

      {/* ─── Right Column: Status / Output ─── */}
      <div className="flex flex-col gap-5">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-8">

          {status === 'idle' && (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(255, 62, 138, 0.2), rgba(155, 89, 182, 0.2))' }}
              >
                <Sparkles className="h-8 w-8 text-[var(--accent-pink)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Train Your LoRA Model</h3>
              <p className="mx-auto max-w-sm text-sm text-[var(--text-secondary)]">
                Upload at least {MIN_IMAGES} images of your character, set a trigger word, and start training. Your model will be ready in 15-45 minutes.
              </p>
              <div className="mx-auto mt-6 max-w-sm space-y-3 text-left">
                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))' }}
                  >1</span>
                  <div>
                    <p className="text-sm font-medium text-white">Upload Images</p>
                    <p className="text-xs text-[var(--text-muted)]">Use clear, high-quality photos with varied poses and angles</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))' }}
                  >2</span>
                  <div>
                    <p className="text-sm font-medium text-white">Set Trigger Word</p>
                    <p className="text-xs text-[var(--text-muted)]">A unique keyword that activates your model in prompts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))' }}
                  >3</span>
                  <div>
                    <p className="text-sm font-medium text-white">Start Training</p>
                    <p className="text-xs text-[var(--text-muted)]">Training takes 15-45 minutes depending on the number of images</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(status === 'uploading' || status === 'training' || status === 'polling') && (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(255, 62, 138, 0.2), rgba(155, 89, 182, 0.2))' }}
              >
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-pink)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {status === 'uploading' ? 'Uploading Images' : 'Training in Progress'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{pollMessage}</p>
              {status === 'polling' && (
                <div className="mx-auto mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full animate-pulse rounded-full"
                    style={{
                      width: '60%',
                      background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))',
                    }}
                  />
                </div>
              )}
              {jobId && (
                <p className="mt-3 text-xs text-[var(--text-muted)]">Job ID: {jobId}</p>
              )}
            </div>
          )}

          {status === 'completed' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Training Complete!</h3>
              <p className="text-sm text-[var(--text-secondary)]">{pollMessage}</p>
              {triggerWord && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Trigger word: <span className="font-mono font-medium text-[var(--accent-pink)]">{triggerWord}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="mt-6 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-white/10 hover:text-white"
              >
                Train Another Model
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Training Failed</h3>
              <p className="text-sm text-red-400">{errorMessage}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-6 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-white/10 hover:text-white"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
