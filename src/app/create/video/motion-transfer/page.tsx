'use client';

import { ChangeEvent, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Coins, Download, Loader2, Play, Sparkles, Upload, X } from 'lucide-react';
import type { PreviewTab } from '@/types';
import { apiFetch, getUserId } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import MotionTransferSeoBlock from './MotionTransferSeoBlock';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/quicktime';
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_PROMPT_CHARS = 5000;
const PRICE_PER_SECOND = 0.084;

const STEPS = [
  { number: 1, title: 'Upload Character Image', desc: 'A photo of a person or character with clear body and head visible.' },
  { number: 2, title: 'Upload Reference Video', desc: 'A video showing the motion you want to transfer (dance, gesture, action).' },
  { number: 3, title: 'Add a Prompt', desc: 'Optionally describe or refine the animation style.' },
  { number: 4, title: 'Generate', desc: 'Choose orientation and hit generate to create your video.' },
];

interface MotionTemplate {
  id: string;
  name: string;
  thumbnail: string;
  videoUrl: string;
}

const MOTION_TEMPLATES: MotionTemplate[] = [
  {
    id: 'mt-fortune-motion',
    name: 'Fortune in Motion',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/fortune-in-motion.mp4',
  },
  {
    id: 'mt-chinese-trend',
    name: 'Chinese Trend',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/chinese-trend.mp4',
  },
  {
    id: 'mt-cute-baby-dance',
    name: 'Cute Baby Dance',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/cute-baby-dance.mp4',
  },
  {
    id: 'mt-color-mixing',
    name: 'Color Mixing',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/color-mixing.mp4',
  },
  {
    id: 'mt-hip-hop',
    name: 'Hip Hop Groove',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/hip-hop-groove.mp4',
  },
  {
    id: 'mt-wave-dance',
    name: 'Wave Dance',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/wave-dance.mp4',
  },
  {
    id: 'mt-ballet-spin',
    name: 'Ballet Spin',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/ballet-spin.mp4',
  },
  {
    id: 'mt-martial-arts',
    name: 'Martial Arts',
    thumbnail: '/images/placeholder.svg',
    videoUrl: '/videos/templates/martial-arts.mp4',
  },
];

function MotionTransferContent() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Character image state
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Reference video state
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null);
  const [referenceVideoFile, setReferenceVideoFile] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Prompt (optional)
  const [prompt, setPrompt] = useState('');

  // Character orientation
  const [orientation, setOrientation] = useState<'image' | 'video'>('image');

  // Right panel
  const [previewTab, setPreviewTab] = useState<PreviewTab>('templates');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoLoadRetries, setVideoLoadRetries] = useState(0);
  const videoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_VIDEO_RETRIES = 5;

  // Estimated cost based on reference video duration
  const estimatedCost = useMemo(() => {
    if (videoDuration <= 0) return null;
    return Math.ceil(videoDuration) * PRICE_PER_SECOND;
  }, [videoDuration]);

  // -- Image upload --
  const handleImageUploadClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please upload an image file (JPG, PNG, WebP, GIF)');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be less than 8 MB');
      return;
    }

    setImageError(null);
    setCharacterImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCharacterImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearImage = useCallback(() => {
    setCharacterImage(null);
    setCharacterImageFile(null);
    setImageError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  // -- Video upload --
  const handleVideoUploadClick = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const setVideoFromFile = useCallback((file: File) => {
    setReferenceVideoFile(file);
    setReferenceVideoUrl(null);
    setSelectedTemplateId(null);

    const objectUrl = URL.createObjectURL(file);
    setReferenceVideo(objectUrl);

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      setVideoDuration(videoEl.duration);
      URL.revokeObjectURL(videoEl.src);
    };
    videoEl.src = objectUrl;
  }, []);

  const handleVideoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setVideoError('Please upload a video file (.mp4 or .mov)');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setVideoError('Video must be less than 50 MB');
      return;
    }

    setVideoError(null);
    setVideoFromFile(file);
  }, [setVideoFromFile]);

  const handleClearVideo = useCallback(() => {
    if (referenceVideo && !referenceVideoUrl) URL.revokeObjectURL(referenceVideo);
    setReferenceVideo(null);
    setReferenceVideoFile(null);
    setReferenceVideoUrl(null);
    setVideoDuration(0);
    setVideoError(null);
    setSelectedTemplateId(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, [referenceVideo, referenceVideoUrl]);

  // -- Template selection: sets reference video --
  const handleTemplateSelect = useCallback((template: MotionTemplate) => {
    if (selectedTemplateId === template.id) {
      // Deselect
      handleClearVideo();
      return;
    }

    setSelectedTemplateId(template.id);
    setReferenceVideoFile(null);
    setReferenceVideoUrl(template.videoUrl);
    setReferenceVideo(template.videoUrl);
    setVideoError(null);
    if (videoInputRef.current) videoInputRef.current.value = '';

    // Get duration from the template video
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      setVideoDuration(videoEl.duration);
    };
    videoEl.onerror = () => {
      setVideoDuration(0);
    };
    videoEl.src = template.videoUrl;
  }, [selectedTemplateId, handleClearVideo]);

  // -- Generation --
  const handleGenerate = useCallback(async () => {
    if (!characterImage || !characterImageFile) return;
    if (!referenceVideoFile && !referenceVideoUrl) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setVideoLoaded(false);
    setVideoLoadRetries(0);
    setPreviewTab('my-creation');

    try {
      // Step 1: Upload the character image
      const imageFormData = new FormData();
      imageFormData.append('file', characterImageFile);

      const imageUpload = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'x-vp-user-id': getUserId() },
        body: imageFormData,
      });

      const imageUploadData = (await imageUpload.json()) as { url?: string; error?: string };
      if (!imageUpload.ok || !imageUploadData.url) {
        throw new Error(imageUploadData.error || 'Failed to upload character image');
      }

      // Step 2: Resolve video URL
      let videoUrlForApi: string;
      if (referenceVideoUrl) {
        // Template video — already a URL
        videoUrlForApi = referenceVideoUrl;
      } else if (referenceVideoFile) {
        // User-uploaded video — upload it first
        const videoFormData = new FormData();
        videoFormData.append('file', referenceVideoFile);

        const videoUpload = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'x-vp-user-id': getUserId() },
          body: videoFormData,
        });

        const videoUploadData = (await videoUpload.json()) as { url?: string; error?: string };
        if (!videoUpload.ok || !videoUploadData.url) {
          throw new Error(videoUploadData.error || 'Failed to upload reference video');
        }
        videoUrlForApi = videoUploadData.url;
      } else {
        throw new Error('No reference video selected');
      }

      // Step 3: Call motion transfer API
      const result = await apiFetch<{
        success: boolean;
        videoUrl: string | null;
        status: 'success' | 'processing';
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
        error?: string;
      }>('/api/ai/video/motion-transfer', {
        method: 'POST',
        body: {
          imageUrl: imageUploadData.url,
          videoUrl: videoUrlForApi,
          prompt: prompt.trim() || '',
          characterOrientation: orientation,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate motion transfer video');
      }

      if (result.status === 'success' && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        setIsGenerating(false);
        return;
      }

      if (result.status === 'processing' && result.job) {
        const jobId = result.job.id;
        const initialDelayMs = 30_000;
        const pollIntervalMs = 10_000;
        const maxTotalMs = 10 * 60_000;

        await new Promise(resolve => setTimeout(resolve, initialDelayMs));

        const startedAt = Date.now();
        while (Date.now() - startedAt < maxTotalMs) {
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
              throw new Error(jobResponse.job.errorMessage || 'Motion transfer failed');
            }
          } catch (pollError) {
            if (pollError instanceof Error && (
              pollError.message.includes('Motion transfer failed') ||
              pollError.message.includes('timed out')
            )) {
              throw pollError;
            }
          }
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error('Motion transfer timed out after 10 minutes');
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Motion transfer failed');
      setIsGenerating(false);
    }
  }, [characterImage, characterImageFile, referenceVideoFile, referenceVideoUrl, prompt, orientation]);

  const handleDownloadVideo = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `motion-transfer-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
    setVideoLoadRetries(0);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!generatedVideoUrl) return;
    if (videoLoadRetries >= MAX_VIDEO_RETRIES) return;

    const nextRetry = videoLoadRetries + 1;
    setVideoLoadRetries(nextRetry);

    if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
    videoRetryTimerRef.current = setTimeout(() => {
      setGeneratedVideoUrl(prev => {
        if (!prev) return prev;
        const base = prev.split('?')[0];
        return `${base}?t=${Date.now()}`;
      });
    }, 5000);
  }, [generatedVideoUrl, videoLoadRetries]);

  const hasReferenceVideo = !!referenceVideoFile || !!referenceVideoUrl;
  const canGenerate = !!characterImage && hasReferenceVideo && !isGenerating;

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="create-page">
            <div className="create-container">
              {/* LEFT PANEL */}
              <div className="create-panel">
                <div className="create-section-header" style={{ marginBottom: '4px' }}>
                  <h1 className="create-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                    AI Motion Transfer — Animate Photos with Video Motion
                  </h1>
                </div>
                <p className="motion-transfer-subtitle">
                  Transfer motion from a reference video onto a character image. Create AI dance clips, character
                  animation, and motion-matched videos from any photo.
                </p>

                <div className="create-divider" />

                {/* Character Image */}
                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">
                      Character Image
                      <span className="create-required">*</span>
                    </span>
                  </div>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={handleImageChange}
                    className="hidden"
                    aria-label="Upload character image"
                  />

                  {characterImage ? (
                    <div className="base-image-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={characterImage}
                        alt="Character preview"
                        className="base-image-preview-img"
                      />
                      <button
                        className="base-image-remove"
                        onClick={handleClearImage}
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="base-image-upload"
                      onClick={handleImageUploadClick}
                      aria-label="Click to upload character image"
                    >
                      <Upload className="base-image-upload-icon" />
                      <span className="base-image-upload-text">
                        Upload character image
                      </span>
                    </button>
                  )}

                  {imageError && <p className="base-image-error">{imageError}</p>}
                </div>

                {/* Reference Video */}
                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">
                      Reference Video
                      <span className="create-required">*</span>
                    </span>
                  </div>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept={ACCEPTED_VIDEO_TYPES}
                    onChange={handleVideoChange}
                    className="hidden"
                    aria-label="Upload reference video"
                  />

                  {referenceVideo ? (
                    <div className="motion-video-preview">
                      <video
                        key={referenceVideo}
                        src={referenceVideo}
                        className="motion-video-preview-player"
                        controls
                        playsInline
                        muted
                      />
                      <button
                        className="base-image-remove"
                        onClick={handleClearVideo}
                        aria-label="Remove video"
                      >
                        <X size={16} />
                      </button>
                      {videoDuration > 0 && (
                        <span className="motion-video-duration">
                          {Math.floor(videoDuration)}s
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      className="base-image-upload"
                      onClick={handleVideoUploadClick}
                      aria-label="Click to upload reference video"
                    >
                      <Play className="base-image-upload-icon" />
                      <span className="base-image-upload-text">
                        Add video of character action to mimic
                      </span>
                    </button>
                  )}

                  {videoError && <p className="base-image-error">{videoError}</p>}
                </div>

                {/* Prompt (optional) */}
                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">Prompt <span className="create-optional">(Optional)</span></span>
                  </div>
                  <textarea
                    className="create-textarea"
                    placeholder="make this image accurately animate to the video"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
                    rows={4}
                  />
                  <div className="create-textarea-count">
                    {prompt.length}/{MAX_PROMPT_CHARS} characters
                  </div>
                </div>

                {/* Character Orientation */}
                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">Character Orientation</span>
                  </div>
                  <div className="video-duration-selector">
                    <button
                      type="button"
                      className={cn(
                        'video-duration-btn',
                        orientation === 'image' && 'video-duration-btn-active'
                      )}
                      onClick={() => setOrientation('image')}
                    >
                      Image
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'video-duration-btn',
                        orientation === 'video' && 'video-duration-btn-active'
                      )}
                      onClick={() => setOrientation('video')}
                    >
                      Video
                    </button>
                  </div>
                  <p className="motion-orientation-hint">
                    {orientation === 'image'
                      ? 'Keeps character pose from image (up to 10s output)'
                      : 'Follows reference video motion (up to 30s output)'}
                  </p>
                </div>

                {/* Estimated Cost */}
                {estimatedCost !== null && (
                  <div className="create-section">
                    <div className="video-price-display">
                      <span className="video-price-label">Estimated Cost</span>
                      <span className="video-price-value">${estimatedCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Generate */}
                <button
                  className="generate-btn"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
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
                      {estimatedCost !== null && (
                        <span className="generate-credits">
                          ${estimatedCost.toFixed(2)}
                          <Coins size={14} />
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT PANEL */}
              <div className="create-preview">
                <div className="preview-tabs">
                  <button
                    className={cn('preview-tab', previewTab === 'templates' && 'preview-tab-active')}
                    onClick={() => setPreviewTab('templates')}
                  >
                    Templates
                  </button>
                  <button
                    className={cn('preview-tab', previewTab === 'my-creation' && 'preview-tab-active')}
                    onClick={() => setPreviewTab('my-creation')}
                  >
                    My Creation
                  </button>
                </div>

                {previewTab === 'templates' ? (
                  <div className="templates-grid">
                    {MOTION_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          'template-card',
                          selectedTemplateId === template.id && 'template-card-selected'
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select template ${template.name}`}
                        aria-pressed={selectedTemplateId === template.id}
                        onClick={() => handleTemplateSelect(template)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTemplateSelect(template);
                          }
                        }}
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
                    ))}
                  </div>
                ) : (
                  <div className="my-creation-grid">
                    {isGenerating && (
                      <div className="creation-card creation-card-generating" style={{ aspectRatio: '16 / 9' }}>
                        <div className="creation-generating-content">
                          <Loader2 size={32} className="creation-generating-spinner" />
                          <span className="creation-generating-text">Generating motion transfer...</span>
                          <span className="creation-generating-subtext">This may take a few minutes</span>
                        </div>
                      </div>
                    )}

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

                    {generationError && (
                      <div className="creation-empty-state">
                        <p className="text-red-400">Generation failed</p>
                        <span>{generationError}</span>
                      </div>
                    )}

                    {!isGenerating && !generatedVideoUrl && !generationError && (
                      <div className="creation-empty-state">
                        <Play size={48} />
                        <p>No videos yet</p>
                        <span>Your generated motion transfer videos will appear here</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* How It Works — below the playground */}
            <div className="motion-how-it-works">
              <h3 className="motion-how-it-works-title">How It Works</h3>
              <div className="motion-steps-row">
                {STEPS.map((step) => (
                  <div key={step.number} className="motion-step-card">
                    <span className="motion-step-number">{step.number}</span>
                    <span className="motion-step-title">{step.title}</span>
                    <span className="motion-step-desc">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <MotionTransferSeoBlock />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function MotionTransferPage() {
  return (
    <Suspense fallback={<div className="create-loading">Loading...</div>}>
      <MotionTransferContent />
    </Suspense>
  );
}
