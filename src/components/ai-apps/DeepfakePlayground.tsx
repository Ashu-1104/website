'use client';

import { useCallback, useState, useRef, useMemo, memo } from 'react';
import {
  Download,
  Loader2,
  X,
  Video,
  Sparkles,
  Info,
  Play,
  Image as ImageIcon,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch, getUserId } from '@/hooks/useApi';

// ============================================================================
// Types
// ============================================================================

type SwapMode = 'single' | 'specific';

interface MediaState {
  faceImage: string | null;
  referenceImage: string | null;
  video: string | null;
  videoFile: File | null;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // 30 seconds (API limit)
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const GENERATION_COST = 100;

const MODE_CONFIG = {
  single: {
    label: 'Single Face',
    description: 'Perfect for videos with one person. Your face replaces theirs seamlessly.',
    icon: User,
  },
  specific: {
    label: 'Multi-Face Select',
    description: 'For group videos. Choose exactly which person to transform.',
    icon: Users,
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
        <div className="w-52 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-xs leading-relaxed text-white shadow-xl">
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
  tooltip: string;
  image: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const ImageUpload = memo(function ImageUpload({
  label,
  tooltip,
  image,
  onSelect,
  onClear,
  disabled = false,
  icon,
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-pink-500">*</span>
          <Tooltip text={tooltip} />
        </div>
        {image && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Remove
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
            'flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-all',
            isDragging
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <ImageIcon className={cn('h-6 w-6', isDragging ? 'text-pink-400' : 'text-text-muted')} />
          <span className="text-xs text-text-muted">Drop image or click to browse</span>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={label} className="h-36 w-full object-contain" loading="lazy" />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Video Upload Component
// ============================================================================

interface VideoUploadProps {
  label: string;
  tooltip: string;
  video: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

const VideoUpload = memo(function VideoUpload({
  label,
  tooltip,
  video,
  onSelect,
  onClear,
  disabled = false,
}: VideoUploadProps) {
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-pink-500">*</span>
          <Tooltip text={tooltip} />
        </div>
        {video && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
        disabled={disabled}
      />

      {!video ? (
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
            'flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-all',
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-white/20 hover:border-white/40 hover:bg-white/5',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
            <Play className={cn('h-5 w-5', isDragging ? 'text-purple-400' : 'text-text-muted')} />
          </div>
          <div className="text-center">
            <span className="block text-xs text-text-muted">Drop video or click to browse</span>
            <span className="mt-1 block text-[10px] text-text-muted/60">MP4, WebM • Max 30 seconds</span>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            src={video}
            className="h-40 w-full object-contain"
            controls
            preload="metadata"
          />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export default function DeepfakePlayground() {
  // State
  const [mode, setMode] = useState<SwapMode>('single');
  const [media, setMedia] = useState<MediaState>({
    faceImage: null,
    referenceImage: null,
    video: null,
    videoFile: null,
  });
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  // Validation
  const canGenerate = useMemo(() => {
    if (mode === 'single') {
      return !!(media.faceImage && media.video);
    }
    return !!(media.faceImage && media.referenceImage && media.video);
  }, [mode, media]);

  // Validate video duration
  const validateVideoDuration = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration <= MAX_VIDEO_DURATION);
      };
      video.onerror = () => resolve(false);
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Image handler
  const handleImageSelect = useCallback(
    (key: 'faceImage' | 'referenceImage') => async (file: File) => {
      setError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Please upload a valid image (PNG, JPG, or WebP)');
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError('Image too large. Maximum size is 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setMedia((prev) => ({ ...prev, [key]: e.target?.result as string }));
        setResultVideo(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Video handler
  const handleVideoSelect = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        setError('Please upload a valid video (MP4 or WebM)');
        return;
      }

      if (file.size > MAX_VIDEO_SIZE) {
        setError('Video too large. Maximum size is 50MB.');
        return;
      }

      const isValidDuration = await validateVideoDuration(file);
      if (!isValidDuration) {
        setError('Video too long. Maximum duration is 30 seconds.');
        return;
      }

      const url = URL.createObjectURL(file);
      setMedia((prev) => ({ ...prev, video: url, videoFile: file }));
      setResultVideo(null);
    },
    [validateVideoDuration]
  );

  // Clear handlers
  const clearMedia = useCallback(
    (key: keyof MediaState) => () => {
      if (key === 'video' && media.video) {
        URL.revokeObjectURL(media.video);
      }
      setMedia((prev) => ({
        ...prev,
        [key]: null,
        ...(key === 'video' ? { videoFile: null } : {}),
      }));
      setResultVideo(null);
    },
    [media.video]
  );

  const clearAll = useCallback(() => {
    if (media.video) URL.revokeObjectURL(media.video);
    setMedia({ faceImage: null, referenceImage: null, video: null, videoFile: null });
    setResultVideo(null);
    setError(null);
    setProgress('');
  }, [media.video]);

  // Mode change
  const handleModeChange = useCallback((newMode: SwapMode) => {
    setMode(newMode);
    setResultVideo(null);
    setError(null);
    setProgress('');
  }, []);

  // Convert a File to a base64 data URI
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Generate — calls /api/ai/deepfake-video with webhook + polling fallback
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !media.videoFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress('Uploading media...');

    try {
      // Convert video file to base64 for upload
      const videoBase64 = await fileToBase64(media.videoFile);

      setProgress('Processing deepfake...');

      // Build request body
      const body: Record<string, unknown> = {
        mode,
        initImage: media.faceImage,
        initVideo: videoBase64,
      };
      if (mode === 'specific' && media.referenceImage) {
        body.referenceImage = media.referenceImage;
      }

      // 1. Call deepfake video API
      type DeepfakeResponse = {
        success: boolean;
        videoUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const result = await apiFetch<DeepfakeResponse>('/api/ai/deepfake-video', {
        method: 'POST',
        body,
      });

      // Immediate success
      if (result.status === 'success' && result.videoUrl) {
        setResultVideo(result.videoUrl);
        setProgress('');
        setIsProcessing(false);
        return;
      }

      // 2. Async processing — poll job status
      if (result.status === 'processing' && result.job) {
        setProgress('Generating video — this may take a few minutes...');

        const jobId = result.job.id;
        const startedAt = Date.now();
        const initialDelayMs = 10_000;    // 10s initial wait
        const pollIntervalMs = 5_000;     // 5s between polls
        const maxTotalMs = 10 * 60_000;   // 10 min timeout

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
              throw new Error(jobResponse.job.errorMessage || 'Deepfake video generation failed');
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

        throw new Error('Deepfake video timed out. Please try again.');
      }

      throw new Error(result.error || 'Failed to create deepfake video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process video. Please try again.');
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  }, [canGenerate, mode, media, fileToBase64]);

  // Download — handles remote URLs
  const handleDownload = useCallback(async () => {
    if (!resultVideo) return;
    try {
      const res = await fetch(resultVideo);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `deepfake-${mode}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(resultVideo, '_blank');
    }
  }, [resultVideo, mode]);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* ================================================================ */}
      {/* Left Panel - Inputs */}
      {/* ================================================================ */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-white">Create Your Deepfake</span>
            <p className="mt-0.5 text-xs text-text-muted">Transform any video with AI-powered face swap</p>
          </div>
          {(media.faceImage || media.referenceImage || media.video) && (
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

        {/* Mode Toggle */}
        <div className="mb-5">
          <div className="flex w-full rounded-xl bg-[#1a1a2e] p-1">
            {(Object.keys(MODE_CONFIG) as SwapMode[]).map((key) => {
              const config = MODE_CONFIG[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleModeChange(key)}
                  disabled={isProcessing}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200',
                    mode === key
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                      : 'text-text-muted hover:text-white',
                    isProcessing && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-muted">{MODE_CONFIG[mode].description}</p>
        </div>

        {/* Media Uploads */}
        <div className="space-y-4">
          {/* Face Image - Always shown */}
          <ImageUpload
            label="Your Face"
            tooltip="Upload a clear photo of the face you want to appear in the video. Front-facing photos work best."
            image={media.faceImage}
            onSelect={handleImageSelect('faceImage')}
            onClear={clearMedia('faceImage')}
            disabled={isProcessing}
            icon={<User className="h-4 w-4 text-pink-400" />}
          />

          {/* Reference Image - Only for specific mode */}
          {mode === 'specific' && (
            <ImageUpload
              label="Target Person"
              tooltip="Upload a photo of the specific person in the video whose face you want to replace. This helps identify which face to swap."
              image={media.referenceImage}
              onSelect={handleImageSelect('referenceImage')}
              onClear={clearMedia('referenceImage')}
              disabled={isProcessing}
              icon={<Users className="h-4 w-4 text-purple-400" />}
            />
          )}

          {/* Video Upload */}
          <VideoUpload
            label="Source Video"
            tooltip="Upload the video you want to transform. Max 30 seconds supported. The face(s) in this video will be replaced."
            video={media.video}
            onSelect={handleVideoSelect}
            onClear={clearMedia('video')}
            disabled={isProcessing}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2">
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
          disabled={!canGenerate || isProcessing}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all',
            !canGenerate || isProcessing
              ? 'cursor-not-allowed bg-white/10 opacity-50'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 hover:shadow-lg hover:shadow-pink-500/20'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Magic...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Deepfake
              <span className="ml-1 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {GENERATION_COST}+
                <span className="text-yellow-400">&#9672;</span>
              </span>
            </>
          )}
        </button>

        {/* Tips */}
        <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="text-xs font-medium text-white/80">Pro Tips</p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-text-muted">
            <li>• Use well-lit, front-facing photos for best results</li>
            <li>• Shorter videos process faster and look better</li>
            <li>• Similar face angles between source and target improve quality</li>
          </ul>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Right Panel - Result */}
      {/* ================================================================ */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">
        {/* Header */}
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

        {/* Result Area */}
        <div className="flex flex-1 items-center justify-center">
          {resultVideo ? (
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                src={resultVideo}
                className="max-h-[450px] w-full object-contain"
                controls
                autoPlay
                loop
                preload="metadata"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                  <Video className="h-8 w-8 text-text-muted" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-secondary)] ring-2 ring-[var(--bg-secondary)]">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                </div>
              </div>
              <div>
                <p className="font-medium text-text-muted">Your creation awaits</p>
                <p className="mt-1 max-w-[200px] text-sm text-text-muted/70">
                  Upload your media and watch the magic happen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
