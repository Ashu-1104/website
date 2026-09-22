'use client';

/**
 * Video Playground - AI Video Generation
 *
 * Generation modes:
 * 1) Image to Video: Upload an image and generate a video from it
 * 2) Text to Video: Generate a video from a text prompt (+ aspect ratio)
 *
 * Scalability/Performance Notes:
 * - State is scoped per-tab to avoid cross-tab invalidation
 * - Template selection is id-based for efficient updates
 * - Derived values are memoized and callbacks are stable
 *
 * TODO: Backend Integration
 * - Templates: Replace mock templates with paginated API calls
 * - My Creation: Replace mock list with user's videos endpoint
 * - Generation: POST to video generation API with settings
 */

import { ChangeEvent, KeyboardEvent, MouseEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Coins, Download, Loader2, Play, Sparkles, Upload, X } from 'lucide-react';
import type { PreviewTab, VideoAspectRatio, VideoCreateTab, VideoTemplate } from '@/types';
import { mockUserVideoCreations } from '@/data/videoTemplates';
import { useVideoTemplates, apiFetch, getUserId } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import VideoGenSeoShell, { VIDEO_GEN_FAQ } from './VideoGenSeoShell';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)(\?|$)/i;
const isDefinitelyImage = (url: string) => IMAGE_EXTENSIONS.test(url) || url.startsWith('data:image/');

/**
 * MediaThumb renders a thumbnail that can be an image, GIF, or video.
 * For URLs that are definitely images (by extension or data URI), it renders <img>.
 * For all other URLs (extensionless CDN links, .mp4, etc.), it tries <video> first
 * and falls back to <img> if the video fails to load.
 */
function MediaThumb({ src, className }: { src: string; className?: string }) {
  const [useImg, setUseImg] = useState(() => isDefinitelyImage(src));

  useEffect(() => {
    setUseImg(isDefinitelyImage(src));
  }, [src]);

  if (useImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={className} />;
  }

  return (
    <video
      src={src}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setUseImg(true)}
    />
  );
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 5000;

const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) return 'Please upload an image file';
  if (file.size > MAX_FILE_SIZE) return 'File size must be less than 8MB';
  return null;
};

interface VideoModelItem {
  id: string;
  modelId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  resolutions: string;
  pricingMatrix: Record<string, number> | null;
  supportsT2V: boolean;
  supportsI2V: boolean;
  durations: string;
  isNew: boolean;
}

function VideoPlaygroundContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // URL-based State (for shareable links)
  // -------------------------------------------------------------------------

  const activeTab: VideoCreateTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab === 'text-to-video' ? 'text-to-video' : 'image-to-video';
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // Left Panel State (Per tab)
  // -------------------------------------------------------------------------

  // Image to Video
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [baseImageAspect, setBaseImageAspect] = useState<string>('16 / 9');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageToVideoPrompt, setImageToVideoPrompt] = useState('');
  const [selectedImageToVideoTemplateId, setSelectedImageToVideoTemplateId] = useState<string | null>(null);

  // Text to Video
  const [textToVideoPrompt, setTextToVideoPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [selectedTextToVideoTemplateId, setSelectedTextToVideoTemplateId] = useState<string | null>(null);

  // Right Panel
  const [previewTab, setPreviewTab] = useState<PreviewTab>('templates');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [videoLoadRetries, setVideoLoadRetries] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingAbortRef = useRef<AbortController | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingAbortRef.current?.abort();
    };
  }, []);

  // Video model selection
  const [videoModels, setVideoModels] = useState<VideoModelItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);

  useEffect(() => {
    fetch('/api/video-models')
      .then(res => res.json())
      .then((data: { models?: VideoModelItem[] }) => {
        const models = data.models ?? [];
        setVideoModels(models);
        if (models.length > 0 && !selectedModelId) {
          setSelectedModelId(models[0].modelId);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedModel = useMemo(
    () => videoModels.find(m => m.modelId === selectedModelId) ?? null,
    [videoModels, selectedModelId]
  );

  // Resolution selection
  const [selectedResolution, setSelectedResolution] = useState<number | null>(null);

  const availableResolutions = useMemo(() => {
    if (!selectedModel) return [];
    return selectedModel.resolutions
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
  }, [selectedModel]);

  // Auto-select first resolution when model changes
  useEffect(() => {
    if (availableResolutions.length > 0) {
      setSelectedResolution(prev =>
        prev && availableResolutions.includes(prev) ? prev : availableResolutions[0]
      );
    } else {
      setSelectedResolution(null);
    }
  }, [availableResolutions]);

  // Duration selection
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const availableDurations = useMemo(() => {
    if (!selectedModel) return [];
    return selectedModel.durations
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
  }, [selectedModel]);

  // Auto-select first duration when model changes
  useEffect(() => {
    if (availableDurations.length > 0) {
      setSelectedDuration(prev =>
        prev && availableDurations.includes(prev) ? prev : availableDurations[0]
      );
    } else {
      setSelectedDuration(null);
    }
  }, [availableDurations]);

  // Dynamic price from pricing matrix
  const currentPrice = useMemo(() => {
    if (!selectedModel?.pricingMatrix || !selectedResolution || !selectedDuration) return null;
    const key = `${selectedResolution}-${selectedDuration}`;
    const price = selectedModel.pricingMatrix[key];
    return typeof price === 'number' ? price : null;
  }, [selectedModel, selectedResolution, selectedDuration]);

  const filteredModels = useMemo(
    () => videoModels.filter(m =>
      activeTab === 'image-to-video' ? m.supportsI2V : m.supportsT2V
    ),
    [videoModels, activeTab]
  );

  // -------------------------------------------------------------------------
  // Derived Values (Memoized)
  // -------------------------------------------------------------------------

  const apiTemplateType = activeTab === 'image-to-video' ? 'IMAGE_TO_VIDEO' : 'TEXT_TO_VIDEO';
  const {
    data: videoTemplatesData,
    loading: videoTemplatesLoading,
    error: videoTemplatesError,
  } = useVideoTemplates({ type: apiTemplateType, limit: 100 });

  const templates = useMemo<VideoTemplate[]>(() => {
    const items = videoTemplatesData?.items ?? [];
    return items.map((template) => ({
      id: template.id,
      name: template.name,
      thumbnail: template.thumbnailUrl || '/images/placeholder.svg',
      prompt: template.prompt || '',
      category: template.category,
      creditCost: template.creditCost,
    }));
  }, [videoTemplatesData]);
  const templatesById = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates]);

  const selectedTemplateId = activeTab === 'image-to-video'
    ? selectedImageToVideoTemplateId
    : selectedTextToVideoTemplateId;

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find(t => t.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId, templates]);

  const creditsNeeded = useMemo(() => {
    return selectedTemplate?.creditCost ?? 100;
  }, [selectedTemplate]);

  // -------------------------------------------------------------------------
  // Callbacks - Tab Navigation
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback((tab: VideoCreateTab) => {
    router.push(`/create/video/generator?tab=${tab}`);
  }, [router]);

  const handlePreviewTabChange = useCallback((tab: PreviewTab) => {
    setPreviewTab(tab);
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - Image Upload
  // -------------------------------------------------------------------------

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setBaseImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBaseImage(dataUrl);

      // Capture natural aspect ratio
      const img = new window.Image();
      img.onload = () => {
        setBaseImageAspect(`${img.naturalWidth} / ${img.naturalHeight}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearBaseImage = useCallback(() => {
    setBaseImage(null);
    setBaseImageFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // -------------------------------------------------------------------------
  // Callbacks - Template Selection
  // -------------------------------------------------------------------------

  const handleTemplateSelect = useCallback((template: VideoTemplate) => {
    if (activeTab === 'image-to-video') {
      setSelectedImageToVideoTemplateId(prev => prev === template.id ? null : template.id);
      setImageToVideoPrompt(template.prompt);
      return;
    }

    setSelectedTextToVideoTemplateId(prev => prev === template.id ? null : template.id);
    setTextToVideoPrompt(template.prompt);
  }, [activeTab]);

  const getTemplateIdFromEventTarget = useCallback((target: EventTarget | null): string | null => {
    if (!(target instanceof HTMLElement)) return null;
    const card = target.closest<HTMLElement>('[data-template-id]');
    return card?.dataset.templateId ?? null;
  }, []);

  const handleTemplatesGridClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const templateId = getTemplateIdFromEventTarget(e.target);
    if (!templateId) return;
    const template = templatesById.get(templateId);
    if (!template) return;
    handleTemplateSelect(template);
  }, [getTemplateIdFromEventTarget, handleTemplateSelect, templatesById]);

  const handleTemplatesGridKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const templateId = getTemplateIdFromEventTarget(e.target);
    if (!templateId) return;
    e.preventDefault();
    const template = templatesById.get(templateId);
    if (!template) return;
    handleTemplateSelect(template);
  }, [getTemplateIdFromEventTarget, handleTemplateSelect, templatesById]);

  // -------------------------------------------------------------------------
  // Callbacks - Generation
  // -------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (activeTab === 'image-to-video') {
      if (!baseImage || !baseImageFile) {
        setUploadError('Please upload a base image first');
        return;
      }
      if (!imageToVideoPrompt.trim()) return;

      setIsGenerating(true);
      setGenerationError(null);
      setGeneratedVideoUrl(null);
      setVideoLoaded(false);
      setVideoLoadRetries(0);
      setPreviewTab('my-creation');

      try {
        // Step 1: Upload the source image
        const formData = new FormData();
        formData.append('file', baseImageFile);

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'x-vp-user-id': getUserId() },
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as { url?: string; error?: string };
        if (!uploadResponse.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        // Step 2: Call img2video API
        const result = await apiFetch<{
          success: boolean;
          videoUrl: string | null;
          status: 'success' | 'processing';
          job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
          error?: string;
        }>('/api/ai/video/img2video', {
          method: 'POST',
          body: { imageUrl: uploadData.url, prompt: imageToVideoPrompt, modelId: selectedModelId, duration: selectedDuration, resolution: selectedResolution },
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate video');
        }

        // Immediate success
        if (result.status === 'success' && result.videoUrl) {
          setGeneratedVideoUrl(result.videoUrl);
          setIsGenerating(false);
          return;
        }

        // Async processing — poll for result
        if (result.status === 'processing' && result.job) {
          const jobId = result.job.id;
          const initialDelayMs = 30_000;
          const pollIntervalMs = 10_000;
          const maxTotalMs = 10 * 60_000;

          // Create an AbortController for this polling session
          pollingAbortRef.current?.abort();
          const pollController = new AbortController();
          pollingAbortRef.current = pollController;

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, initialDelayMs);
            pollController.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Polling aborted', 'AbortError')); });
          });

          const startedAt = Date.now();
          while (Date.now() - startedAt < maxTotalMs) {
            if (pollController.signal.aborted) return;
            try {
              const jobResponse = await apiFetch<{
                success: boolean;
                job: { status: string; resultUrl?: string; errorMessage?: string };
              }>(`/api/jobs/${jobId}`);

              if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
                setGeneratedVideoUrl(jobResponse.job.resultUrl);
                setIsGenerating(false);
                return;
              }
              if (jobResponse.job.status === 'FAILED') {
                throw new Error(jobResponse.job.errorMessage || 'Video generation failed');
              }
            } catch (pollError) {
              if (pollError instanceof DOMException && pollError.name === 'AbortError') return;
              if (pollError instanceof Error && (
                pollError.message.includes('Video generation failed') ||
                pollError.message.includes('timed out')
              )) {
                throw pollError;
              }
            }
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(resolve, pollIntervalMs);
              pollController.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Polling aborted', 'AbortError')); });
            });
          }
          throw new Error('Video generation timed out after 10 minutes');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
        setIsGenerating(false);
      }
      return;
    }

    if (!textToVideoPrompt.trim()) return;

    // Text-to-Video generation
    const portrait = aspectRatio === '9:16';

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setVideoLoaded(false);
    setVideoLoadRetries(0);
    setPreviewTab('my-creation');

    try {
      const result = await apiFetch<{
        success: boolean;
        videoUrl: string | null;
        status: 'success' | 'processing';
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        error?: string;
      }>('/api/ai/video/text2video', {
        method: 'POST',
        body: { prompt: textToVideoPrompt, portrait, modelId: selectedModelId, duration: selectedDuration, resolution: selectedResolution },
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate video');
      }

      // Immediate success
      if (result.status === 'success' && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        setIsGenerating(false);
        return;
      }

      // Async processing — poll for result
      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const initialDelayMs = 30_000;
        const pollIntervalMs = 10_000;
        const maxTotalMs = 10 * 60_000; // 10 minutes

        // Create an AbortController for this polling session
        pollingAbortRef.current?.abort();
        const pollController = new AbortController();
        pollingAbortRef.current = pollController;

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, initialDelayMs);
          pollController.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Polling aborted', 'AbortError')); });
        });

        const startedAt = Date.now();
        while (Date.now() - startedAt < maxTotalMs) {
          if (pollController.signal.aborted) return;
          try {
            const jobResponse = await apiFetch<{
              success: boolean;
              job: { status: string; resultUrl?: string; errorMessage?: string };
            }>(`/api/jobs/${jobId}`);

            if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
              setGeneratedVideoUrl(jobResponse.job.resultUrl);
              setIsGenerating(false);
              return;
            }
            if (jobResponse.job.status === 'FAILED') {
              throw new Error(jobResponse.job.errorMessage || 'Video generation failed');
            }
          } catch (pollError) {
            if (pollError instanceof DOMException && pollError.name === 'AbortError') return;
            if (pollError instanceof Error && (
              pollError.message.includes('Video generation failed') ||
              pollError.message.includes('timed out')
            )) {
              throw pollError;
            }
            // Network errors — retry silently
          }
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, pollIntervalMs);
            pollController.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Polling aborted', 'AbortError')); });
          });
        }
        throw new Error('Video generation timed out after 10 minutes');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : 'Video generation failed');
      setIsGenerating(false);
    }
  }, [
    activeTab,
    aspectRatio,
    baseImage,
    baseImageFile,
    imageToVideoPrompt,
    selectedDuration,
    selectedModelId,
    selectedResolution,
    textToVideoPrompt,
  ]);

  const handleDownloadVideo = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  const MAX_VIDEO_RETRIES = 5;

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoLoadRetries(0);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!generatedVideoUrl) return;
    if (videoLoadRetries >= MAX_VIDEO_RETRIES) return;

    const nextRetry = videoLoadRetries + 1;
    console.warn(`[Video] Load failed, retrying (${nextRetry}/${MAX_VIDEO_RETRIES}) in 5s...`);
    setVideoLoadRetries(nextRetry);

    if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
    videoRetryTimerRef.current = setTimeout(() => {
      // Force reload by appending a cache-buster
      setGeneratedVideoUrl(prev => {
        if (!prev) return prev;
        const base = prev.split('?')[0];
        return `${base}?t=${Date.now()}`;
      });
    }, 5000);
  }, [generatedVideoUrl, videoLoadRetries]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="create-page">
            <div className="create-container">
              {/* ============================================================
                  LEFT PANEL - Video Generation
                  ============================================================ */}
              <div className="create-panel">
                {/* Main Tabs: Image to Video / Text to Video */}
                <div className="create-tabs">
                  <button
                    className={cn('create-tab', activeTab === 'image-to-video' && 'create-tab-active')}
                    onClick={() => handleTabChange('image-to-video')}
                  >
                    Image to Video
                  </button>
                  <button
                    className={cn('create-tab', activeTab === 'text-to-video' && 'create-tab-active')}
                    onClick={() => handleTabChange('text-to-video')}
                  >
                    Text to Video
                  </button>
                </div>

                <div className="create-divider" />

                {/* AI Model Selector */}
                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">AI Model</span>
                  </div>
                  <button
                    type="button"
                    className="video-model-selector-btn"
                    onClick={() => setShowModelModal(true)}
                  >
                    {selectedModel ? (
                      <div className="video-model-selector-info">
                        {selectedModel.thumbnailUrl && (
                          <div className="video-model-selector-thumb">
                            <MediaThumb src={selectedModel.thumbnailUrl} className="video-model-selector-thumb-img" />
                          </div>
                        )}
                        <div className="video-model-selector-details">
                          <span className="video-model-selector-name">{selectedModel.name}</span>
                          <span className="video-model-selector-meta">
                            {selectedModel.resolutions.split(',').map(r => `${r.trim()}p`).join(', ')}
                            {currentPrice !== null && <> &middot; ${currentPrice.toFixed(2)}</>}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="video-model-selector-placeholder">Select a model</span>
                    )}
                    <ChevronRight size={18} className="text-text-muted" />
                  </button>
                </div>

                {activeTab === 'image-to-video' ? (
                  <>
                    {/* Base Image Upload */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Base Image
                          <span className="create-required">*</span>
                        </span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="Upload base image"
                      />

                      {baseImage ? (
                        <div className="base-image-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={baseImage}
                            alt="Base image preview"
                            className="base-image-preview-img"
                          />
                          <button
                            className="base-image-remove"
                            onClick={handleClearBaseImage}
                            aria-label="Remove image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="base-image-upload"
                          onClick={handleUploadClick}
                          aria-label="Click to upload base image"
                        >
                          <Upload className="base-image-upload-icon" />
                          <span className="base-image-upload-text">
                            Click to upload or select image
                          </span>
                        </button>
                      )}

                      {uploadError && (
                        <p className="base-image-error">{uploadError}</p>
                      )}
                    </div>

                    {/* Prompt */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Prompts
                          <span className="create-required">*</span>
                        </span>
                      </div>
                      <textarea
                        className="create-textarea"
                        placeholder="Describe the video you want to create"
                        value={imageToVideoPrompt}
                        onChange={e => setImageToVideoPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
                        rows={5}
                      />
                      <div className="create-textarea-count">
                        {imageToVideoPrompt.length}/{MAX_PROMPT_CHARS} characters
                      </div>
                    </div>

                    {/* Resolution Selector */}
                    {availableResolutions.length > 0 && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Resolution</span>
                        </div>
                        <div className="video-duration-selector">
                          {availableResolutions.map((res) => (
                            <button
                              key={res}
                              type="button"
                              className={cn(
                                'video-duration-btn',
                                selectedResolution === res && 'video-duration-btn-active'
                              )}
                              onClick={() => setSelectedResolution(res)}
                            >
                              {res}p
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duration Selector */}
                    {availableDurations.length > 0 && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Duration</span>
                        </div>
                        <div className="video-duration-selector">
                          {availableDurations.map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              className={cn(
                                'video-duration-btn',
                                selectedDuration === dur && 'video-duration-btn-active'
                              )}
                              onClick={() => setSelectedDuration(dur)}
                            >
                              {dur}s
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Price */}
                    {currentPrice !== null && (
                      <div className="create-section">
                        <div className="video-price-display">
                          <span className="video-price-label">Estimated Cost</span>
                          <span className="video-price-value">${currentPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Generate */}
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={!baseImage || !imageToVideoPrompt.trim() || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="creation-generating-spinner" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate
                          <span className="generate-credits">
                            {creditsNeeded}+
                            <Coins size={14} />
                          </span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Prompt */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Prompts
                          <span className="create-required">*</span>
                        </span>
                      </div>
                      <textarea
                        className="create-textarea"
                        placeholder="Describe the video you want to create"
                        value={textToVideoPrompt}
                        onChange={e => setTextToVideoPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
                        rows={6}
                      />
                      <div className="create-textarea-count">
                        {textToVideoPrompt.length}/{MAX_PROMPT_CHARS} characters
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Aspect Ratio
                          <span className="create-required">*</span>
                        </span>
                      </div>
                      <div className="aspect-ratio-selector">
                        <button
                          className={cn('aspect-ratio-btn', aspectRatio === '16:9' && 'aspect-ratio-btn-active')}
                          onClick={() => setAspectRatio('16:9')}
                        >
                          <div className={cn('aspect-ratio-icon', 'aspect-ratio-landscape')}>
                            <span>16:9</span>
                          </div>
                          <span className="aspect-ratio-label">16:9</span>
                        </button>
                        <button
                          className={cn('aspect-ratio-btn', aspectRatio === '9:16' && 'aspect-ratio-btn-active')}
                          onClick={() => setAspectRatio('9:16')}
                        >
                          <div className={cn('aspect-ratio-icon', 'aspect-ratio-portrait')}>
                            <span>9:16</span>
                          </div>
                          <span className="aspect-ratio-label">9:16</span>
                        </button>
                      </div>
                    </div>

                    {/* Resolution Selector */}
                    {availableResolutions.length > 0 && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Resolution</span>
                        </div>
                        <div className="video-duration-selector">
                          {availableResolutions.map((res) => (
                            <button
                              key={res}
                              type="button"
                              className={cn(
                                'video-duration-btn',
                                selectedResolution === res && 'video-duration-btn-active'
                              )}
                              onClick={() => setSelectedResolution(res)}
                            >
                              {res}p
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duration Selector */}
                    {availableDurations.length > 0 && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Duration</span>
                        </div>
                        <div className="video-duration-selector">
                          {availableDurations.map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              className={cn(
                                'video-duration-btn',
                                selectedDuration === dur && 'video-duration-btn-active'
                              )}
                              onClick={() => setSelectedDuration(dur)}
                            >
                              {dur}s
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Price */}
                    {currentPrice !== null && (
                      <div className="create-section">
                        <div className="video-price-display">
                          <span className="video-price-label">Estimated Cost</span>
                          <span className="video-price-value">${currentPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Generate */}
                    <button
                      className="generate-btn"
                      onClick={handleGenerate}
                      disabled={!textToVideoPrompt.trim() || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="creation-generating-spinner" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate
                          <span className="generate-credits">
                            {creditsNeeded}+
                            <Coins size={14} />
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* ============================================================
                  RIGHT PANEL - Templates / My Creation
                  ============================================================ */}
              <div className="create-preview">
                <div className="preview-tabs">
                  <button
                    className={cn('preview-tab', previewTab === 'templates' && 'preview-tab-active')}
                    onClick={() => handlePreviewTabChange('templates')}
                  >
                    Templates
                  </button>
                  <button
                    className={cn('preview-tab', previewTab === 'my-creation' && 'preview-tab-active')}
                    onClick={() => handlePreviewTabChange('my-creation')}
                  >
                    My Creation
                  </button>
                </div>

                {previewTab === 'templates' ? (
                  <div
                    className="templates-grid"
                    onClick={handleTemplatesGridClick}
                    onKeyDown={handleTemplatesGridKeyDown}
                  >
                    {videoTemplatesLoading ? (
                      <div className="creation-empty-state">
                        <p>Loading templates…</p>
                      </div>
                    ) : videoTemplatesError ? (
                      <div className="creation-empty-state">
                        <p className="text-red-400">Failed to load templates</p>
                        <span>{videoTemplatesError}</span>
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="creation-empty-state">
                        <p>No templates found</p>
                        <span>Seed the database or add video templates to get started.</span>
                      </div>
                    ) : (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          data-template-id={template.id}
                          className={cn(
                            'template-card',
                            selectedTemplateId === template.id && 'template-card-selected'
                          )}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select template ${template.name}`}
                          aria-pressed={selectedTemplateId === template.id}
                        >
                          <div className={cn('template-card-image', 'gallery-item-video')}>
                            <Image
                              src={template.thumbnail}
                              alt={template.name}
                              fill
                              className="template-card-img"
                            />
                            <div className="gallery-item-play" aria-hidden="true">
                              <Play size={18} />
                            </div>
                          </div>
                          <span className="template-card-name">{template.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="my-creation-grid">
                    {/* Generating placeholder */}
                    {isGenerating && (
                      <div
                        className="creation-card creation-card-generating"
                        style={{ aspectRatio: activeTab === 'image-to-video' ? baseImageAspect : (aspectRatio === '9:16' ? '9 / 16' : '16 / 9') }}
                      >
                        <div className="creation-generating-content">
                          <Loader2 size={32} className="creation-generating-spinner" />
                          <span className="creation-generating-text">Generating video...</span>
                          <span className="creation-generating-subtext">This may take a few minutes</span>
                        </div>
                      </div>
                    )}

                    {/* Generated video */}
                    {generatedVideoUrl && (
                      <div className="video-result-card">
                        <video
                          key={generatedVideoUrl}
                          src={generatedVideoUrl}
                          className="video-result-player"
                          controls
                          playsInline
                          preload="auto"
                          onLoadedData={handleVideoLoaded}
                          onError={handleVideoError}
                        />
                        {!videoLoaded && videoLoadRetries > 0 && videoLoadRetries < MAX_VIDEO_RETRIES && (
                          <div className="video-retry-overlay">
                            <Loader2 size={24} className="creation-generating-spinner" />
                            <span>Loading video... (attempt {videoLoadRetries}/{MAX_VIDEO_RETRIES})</span>
                          </div>
                        )}
                        {videoLoadRetries >= MAX_VIDEO_RETRIES && !videoLoaded && (
                          <div className="video-retry-overlay">
                            <span>Video failed to load.</span>
                            <button
                              className="video-download-btn"
                              onClick={() => {
                                setVideoLoadRetries(0);
                                const base = generatedVideoUrl.split('?')[0];
                                setGeneratedVideoUrl(`${base}?t=${Date.now()}`);
                              }}
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        <div className="video-result-actions">
                          <button
                            className="video-download-btn"
                            onClick={() => handleDownloadVideo(generatedVideoUrl)}
                          >
                            <Download size={16} />
                            Download
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {generationError && (
                      <div className="creation-empty-state">
                        <p className="text-red-400">Generation failed</p>
                        <span>{generationError}</span>
                      </div>
                    )}

                    {/* Past creations */}
                    {!isGenerating && !generatedVideoUrl && !generationError && (
                      mockUserVideoCreations.length > 0 ? (
                        mockUserVideoCreations.map((creation) => (
                          <div key={creation.id} className={cn('creation-card', 'gallery-item-video')}>
                            <div className="creation-card-image">
                              <Image
                                src={creation.thumbnail}
                                alt={creation.prompt || 'Generated video'}
                                fill
                                className="creation-card-img"
                              />
                              <div className="gallery-item-play" aria-hidden="true">
                                <Play size={18} />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="creation-empty-state">
                          <Play size={48} />
                          <p>No videos yet</p>
                          <span>Your generated videos will appear here</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Video Model Selection Modal */}
      {showModelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModelModal(false); }}
        >
          <div className="video-model-modal">
            <div className="video-model-modal-header">
              <h2 className="video-model-modal-title">Select AI Model</h2>
              <button
                type="button"
                className="video-model-modal-close"
                onClick={() => setShowModelModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="video-model-modal-list">
              {filteredModels.length === 0 ? (
                <p className="text-text-muted text-center py-8">No models available for this mode.</p>
              ) : (
                filteredModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={cn(
                      'video-model-modal-card',
                      selectedModelId === model.modelId && 'video-model-modal-card-selected'
                    )}
                    onClick={() => {
                      setSelectedModelId(model.modelId);
                      setShowModelModal(false);
                    }}
                  >
                    <div className="video-model-modal-card-thumb">
                      {model.thumbnailUrl ? (
                        <MediaThumb src={model.thumbnailUrl} className="video-model-modal-card-thumb-img" />
                      ) : (
                        <div className="video-model-modal-card-thumb-placeholder" />
                      )}
                      {model.isNew && <span className="video-model-modal-card-new">NEW</span>}
                    </div>
                    <div className="video-model-modal-card-body">
                      <div className="video-model-modal-card-row">
                        <span className="video-model-modal-card-name">
                          <span className="video-model-modal-card-dot" />
                          {model.name}
                        </span>
                        <span className="video-model-modal-card-res">{model.resolutions.split(',').map(r => `${r.trim()}p`).join(', ')}</span>
                      </div>
                      {model.description && (
                        <p className="video-model-modal-card-desc">{model.description}</p>
                      )}
                      <div className="video-model-modal-card-tags">
                        {model.supportsT2V && <span className="video-model-tag video-model-tag-t2v">T2V</span>}
                        {model.supportsI2V && <span className="video-model-tag video-model-tag-i2v">I2V</span>}
                        <span className="video-model-tag video-model-tag-duration">{model.durations.split(',').map(d => `${d.trim()}s`).join(', ')}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}

export default function VideoPlaygroundPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Veloura.ai — AI Video Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: `${APP_URL}/create/video/generator`,
    description:
      'Generate AI videos from text prompts or animate still images. Cinematic, anime, and realistic video generation — free, NSFW supported, no installs.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1320' },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: VIDEO_GEN_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Create', item: `${APP_URL}/create` },
      { '@type': 'ListItem', position: 3, name: 'Video', item: `${APP_URL}/create/video` },
      { '@type': 'ListItem', position: 4, name: 'AI Video Generator', item: `${APP_URL}/create/video/generator` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Suspense fallback={<VideoGenSeoShell />}>
        <VideoPlaygroundContent />
      </Suspense>
    </>
  );
}
