'use client';

/**
 * Edit Image landing page.
 *
 * This page mirrors the "Generate" UI language (panels/tabs) and provides:
 * - Base image upload (required)
 * - Editing type selection (Prompt / Mask)
 * - Right panel landing preview with example images
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, Coins, Download, HelpCircle, Image as ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { apiFetch, getUserId } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/context/SidebarContext';
import MaskEditor, { type MaskEditorHandle } from '@/components/edit-image/MaskEditor';
import EditImageSeoBlock from './EditImageSeoBlock';

type EditPreviewTab = 'edit-image' | 'my-creation';
type EditMode = 'prompt' | 'mask';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const EDIT_IMAGE_CREDITS = 40;
const INPAINT_MODELS = [{ id: 'lazymixv4-inpaint', label: 'lazymixv4-inpaint' }] as const;

const validateImageFile = (file: File): string | null => {
  if (!file.type.startsWith('image/')) return 'Please upload an image file';
  if (file.size > MAX_FILE_SIZE) return 'File size must be less than 8MB';
  return null;
};

function EditImageLandingPreview({
  baseImage,
  baseImageDimensions,
}: {
  baseImage: string | null;
  baseImageDimensions: { width: number; height: number } | null;
}) {
  const samples = useMemo(() => {
    if (baseImage) {
      return [
        { src: baseImage, alt: 'Base image preview' },
        { src: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/XEBMWcOeTHUGOlQ4NLjUQb1CcJOoNA-metaMWE1ODBjOGUtM2JlYi00NmIzLTk2ZTUtNTY3Y2U3NmEzNmY0LmpwZWc%3D-.jpg', alt: 'Edited image preview placeholder' },
      ];
    }

    return [
      { src: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/ae796f25-7c05-4415-8fc5-8bc1f7c06e12.jpeg', alt: 'Base image example' },
      { src: 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/XEBMWcOeTHUGOlQ4NLjUQb1CcJOoNA-metaMWE1ODBjOGUtM2JlYi00NmIzLTk2ZTUtNTY3Y2U3NmEzNmY0LmpwZWc%3D-.jpg', alt: 'Edited image example' },
    ];
  }, [baseImage]);

  const uploadedAspectRatio =
    baseImage && baseImageDimensions ? `${baseImageDimensions.width} / ${baseImageDimensions.height}` : undefined;

  return (
    <div className="edit-image-landing" role="region" aria-label="Edit image preview">
      <div className="edit-image-samples">
        {samples.map((sample, index) => (
          <div
            key={index}
            className="edit-image-sample"
            style={uploadedAspectRatio ? { aspectRatio: uploadedAspectRatio } : undefined}
          >
            <Image
              src={sample.src}
              alt={sample.alt}
              fill
              className="edit-image-sample-img"
              priority={!baseImage}
            />
          </div>
        ))}

        {baseImage && (
          <div className="edit-image-result-hint" aria-hidden="true">
            <span>Your edited result will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditImagePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskEditorRef = useRef<MaskEditorHandle>(null);

  const [previewTab, setPreviewTab] = useState<EditPreviewTab>('edit-image');
  const [selectedMode, setSelectedMode] = useState<EditMode | null>(null);
  const [modeSelectionError, setModeSelectionError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageDimensions, setBaseImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [imageStrength, setImageStrength] = useState(1);
  const [inpaintModelId, setInpaintModelId] = useState<(typeof INPAINT_MODELS)[number]['id']>(
    INPAINT_MODELS[0].id
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearBaseImage = useCallback(() => {
    setBaseImage(null);
    setBaseImageDimensions(null);
    setBaseImageFile(null);
    setUploadError(null);
    setModeSelectionError(null);
    setSelectedMode(null);
    setPrompt('');
    setImageStrength(1);
    setIsGenerating(false);
    setGeneratedImages([]);
    setGenerationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      setBaseImage(null);
      setBaseImageDimensions(null);
      setBaseImageFile(null);
      return;
    }

    setUploadError(null);
    setModeSelectionError(null);
    setBaseImageDimensions(null);
    setBaseImageFile(file);
    setGeneratedImages([]);
    setGenerationError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Capture dimensions so the right-side preview can match the uploaded image aspect ratio
      // instead of forcing everything into a portrait layout.
      const img = new window.Image();
      img.onload = () => {
        setBaseImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setBaseImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setUploadError(error);
      setBaseImage(null);
      setBaseImageDimensions(null);
      setBaseImageFile(null);
      return;
    }

    setUploadError(null);
    setModeSelectionError(null);
    setBaseImageDimensions(null);
    setBaseImageFile(file);
    setGeneratedImages([]);
    setGenerationError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        setBaseImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setBaseImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleModeSelect = useCallback((mode: EditMode) => {
    // We intentionally don't use the native `disabled` attribute so clicks can
    // show a helpful message instead of silently doing nothing.
    if (!baseImageFile) {
      setModeSelectionError('To proceed, please upload an image first and then select the available options.');
      return;
    }

    setModeSelectionError(null);
    setSelectedMode(mode);
    setPreviewTab('edit-image');
    // After selecting a mode, we show the corresponding playground and hide the mode buttons.
  }, [baseImageFile]);

  const canSelectMode = Boolean(baseImageFile);
  const isInPlayground = selectedMode !== null;

  const handleBackToModeSelection = useCallback(() => {
    setSelectedMode(null);
    setModeSelectionError(null);
    setPreviewTab('edit-image');
  }, []);

  const updateImageStrength = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setImageStrength(Math.round(clamped * 10) / 10);
  }, []);

  const handleDownloadImage = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `edit-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  // Close lightbox on ESC key (same behavior as /create text-to-image)
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  const handleGenerate = useCallback(async () => {
    if (!selectedMode || !baseImage || !baseImageFile || !prompt.trim()) return;

    const isMaskMode = selectedMode === 'mask';

    const maskDataUrl = isMaskMode ? maskEditorRef.current?.exportMaskDataUrl() : null;
    if (isMaskMode && !maskDataUrl) {
      setGenerationError('Please draw a mask on the image first.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedImages([]);
    setPreviewTab('my-creation');

    try {
      const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'x-vp-user-id': getUserId() },
          body: formData,
        });

        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          throw new Error(data.error || 'Failed to upload image');
        }

        return data.url;
      };

      const initImageUrl = await uploadFile(baseImageFile);

      if (isMaskMode) {
        const maskBlob = await fetch(maskDataUrl!).then((res) => res.blob());
        const maskFile = new File([maskBlob], `mask-${Date.now()}.png`, {
          type: maskBlob.type || 'image/png',
        });
        const maskImageUrl = await uploadFile(maskFile);

        const result = await apiFetch<{
          success: boolean;
          status: string;
          imageUrl: string | null;
          imageUrls?: string[];
          requestId?: string | null;
        }>('/api/ai/image/inpaint', {
          method: 'POST',
          body: {
            model_id: inpaintModelId,
            prompt: prompt.trim(),
            init_image: initImageUrl,
            mask_image: maskImageUrl,
            strength: imageStrength,
          },
        });

        if (!result.success) {
          throw new Error('Failed to edit image');
        }

        const images = result.imageUrls?.length ? result.imageUrls : result.imageUrl ? [result.imageUrl] : [];
        if (images.length === 0) throw new Error('No image returned from inpainting');

        setGeneratedImages(images);
        setIsGenerating(false);
        return;
      }

      type ImageEditApiResponse = {
        success: boolean;
        imageUrl: string | null;
        status: string;
        error?: string;
        job?: { id: string; trackId: number; webhookEnabled: boolean } | null;
      };

      const imageResult = await apiFetch<ImageEditApiResponse>('/api/ai/image/edit', {
        method: 'POST',
        body: { imageUrl: initImageUrl, prompt: prompt.trim() },
      });

      if (imageResult.status === 'success' && imageResult.imageUrl) {
        setGeneratedImages([imageResult.imageUrl]);
        setIsGenerating(false);
        return;
      }

      if (imageResult.status === 'processing' && imageResult.job) {
        const jobId = imageResult.job.id;
        const startedAt = Date.now();
        const initialDelayMs = 30_000;
        const pollIntervalMs = 5_000;
        const maxTotalMs = 5 * 60_000; // 5 minutes

        await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

        while (Date.now() - startedAt < maxTotalMs) {
          try {
            const jobResponse = await apiFetch<{
              success: boolean;
              job: { status: string; resultUrl?: string; errorMessage?: string };
            }>(`/api/jobs/${jobId}`);

            if (jobResponse.job.status === 'COMPLETED' && jobResponse.job.resultUrl) {
              setGeneratedImages([jobResponse.job.resultUrl]);
              setIsGenerating(false);
              return;
            }

            if (jobResponse.job.status === 'FAILED') {
              throw new Error(jobResponse.job.errorMessage || 'Image edit failed');
            }
          } catch (pollError) {
            if (
              pollError instanceof Error &&
              (pollError.message.includes('Image edit failed') || pollError.message.includes('timed out'))
            ) {
              throw pollError;
            }
            // Network error — keep polling
          }

          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error('Image edit timed out');
      }

      throw new Error(imageResult.error || 'Failed to edit image');
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Image edit failed');
      setIsGenerating(false);
    }
  }, [baseImage, baseImageFile, imageStrength, inpaintModelId, prompt, selectedMode]);

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="create-page">
            <div className="create-container">
              {/* Left Panel */}
              <div className="create-panel">
                {isInPlayground && (
                  <button
                    className="edit-image-back-btn"
                    onClick={handleBackToModeSelection}
                    type="button"
                    aria-label="Back to editing type selection"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}

                <div className="create-section">
                  <div className="create-section-header">
                    <span className="create-section-title">
                      Base Image <span className="create-required">*</span>
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
                      className={cn('base-image-upload', isDragging && 'base-image-upload-dragging')}
                      onClick={handleUploadClick}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      aria-label="Click to upload or drag and drop base image"
                    >
                      <Upload className="base-image-upload-icon" />
                      <span className="base-image-upload-text">
                        {isDragging ? 'Drop image here' : 'Click to upload or drag & drop image'}
                      </span>
                    </button>
                  )}

                  {uploadError && <p className="base-image-error">{uploadError}</p>}
                </div>

                {!isInPlayground ? (
                  <div className="create-section edit-image-mode-section">
                    <div className="create-section-header">
                      <span className="create-section-title">Select Editing type</span>
                    </div>

                    <div className="edit-image-mode-buttons">
                      <button
                        className="edit-image-mode-btn"
                        onClick={() => handleModeSelect('prompt')}
                        aria-disabled={!canSelectMode}
                      >
                        Edit using Prompt
                      </button>

                      <div className="edit-image-mode-divider" aria-hidden="true">
                        <span className="edit-image-mode-divider-line" />
                        <span className="edit-image-mode-divider-text">or</span>
                        <span className="edit-image-mode-divider-line" />
                      </div>

                      <button
                        className="edit-image-mode-btn"
                        onClick={() => handleModeSelect('mask')}
                        aria-disabled={!canSelectMode}
                      >
                        <span className="edit-image-mode-btn-content">
                          <span>Edit using Mask</span>
                          <span
                            className="edit-image-tooltip"
                            data-tooltip="More control over the part you want to edit using mask."
                          >
                            <HelpCircle className="edit-image-tooltip-icon" />
                          </span>
                        </span>
                      </button>
                    </div>

                    {modeSelectionError && (
                      <p className="edit-image-mode-error" role="alert">
                        {modeSelectionError}
                      </p>
                    )}
                  </div>
	                ) : (
	                  <>
                    <div className="create-section">
                      <div className="create-section-header">
                        <span className="create-section-title">
                          Prompts <span className="create-required">*</span>
                        </span>
                      </div>
                      <textarea
                        className="create-textarea"
                        placeholder="Describe what you want to create from the images"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {selectedMode === 'mask' && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Model</span>
                        </div>
                        <select
                          className="models-select"
                          value={inpaintModelId}
                          onChange={(e) => setInpaintModelId(e.target.value as typeof inpaintModelId)}
                          aria-label="Inpainting model"
                        >
                          {INPAINT_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedMode === 'mask' && (
                      <div className="create-section">
                        <div className="create-section-header">
                          <span className="create-section-title">Image strength</span>
                        </div>
	                        <div className="lora-strength-row">
	                          <span className="lora-strength-label">Image strength</span>
	                          <input
	                            type="number"
	                            className="lora-strength-input"
	                            value={imageStrength}
	                            min={0}
	                            max={1}
	                            step={0.1}
	                            onChange={(e) => {
	                              const val = parseFloat(e.target.value);
	                              if (!isNaN(val)) updateImageStrength(val);
	                            }}
	                          />
	                        </div>
	                        <input
	                          type="range"
	                          className="lora-strength-slider"
	                          min={0}
	                          max={1}
	                          step={0.1}
	                          value={imageStrength}
	                          onChange={(e) => updateImageStrength(parseFloat(e.target.value))}
	                        />
	                      </div>
	                    )}

	                    <button
	                      className="generate-btn"
	                      onClick={handleGenerate}
	                      disabled={!baseImageFile || !prompt.trim() || isGenerating}
	                    >
	                      {isGenerating ? <Loader2 size={18} className="creation-generating-spinner" /> : <Sparkles size={18} />}
	                      {isGenerating ? 'Generating...' : 'Generate'}
	                      <span className="generate-credits">
	                        {EDIT_IMAGE_CREDITS}+
	                        <Coins size={14} />
	                      </span>
	                    </button>
	                  </>
	                )}
              </div>

              {/* Right Panel */}
              <div className="create-preview">
                <div className="preview-tabs">
                  <button
                    className={cn('preview-tab', previewTab === 'edit-image' && 'preview-tab-active')}
                    onClick={() => setPreviewTab('edit-image')}
                  >
                    Edit Image
                  </button>
                  <button
                    className={cn('preview-tab', previewTab === 'my-creation' && 'preview-tab-active')}
                    onClick={() => setPreviewTab('my-creation')}
                  >
                    My Creation
                  </button>
                </div>

                {previewTab === 'edit-image' ? (
                  selectedMode === 'mask' ? (
                    baseImage ? (
                      <div className="mask-editor-wrapper">
                        <MaskEditor ref={maskEditorRef} imageSrc={baseImage} />
                      </div>
                    ) : (
                      <div className="edit-image-loading">Loading image…</div>
                    )
                  ) : (
                    <EditImageLandingPreview baseImage={baseImage} baseImageDimensions={baseImageDimensions} />
	                  )
	                ) : (
	                  <div className="my-creation-grid">
	                    {isGenerating && (
	                      <div className="creation-card creation-card-generating">
	                        <div className="creation-generating-content">
	                          <Loader2 size={32} className="creation-generating-spinner" />
	                          <span className="creation-generating-text">Generating...</span>
	                        </div>
	                      </div>
	                    )}

		                    {generatedImages.map((url, i) => (
		                      <div
		                        key={`edited-${i}`}
		                        className="creation-card"
		                        style={
		                          baseImageDimensions
		                            ? { aspectRatio: `${baseImageDimensions.width} / ${baseImageDimensions.height}` }
		                            : undefined
		                        }
                            role="button"
                            tabIndex={0}
                            onClick={() => setLightboxImage(url)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setLightboxImage(url);
                              }
                            }}
                            aria-label={`Open edited image ${i + 1}`}
		                      >
		                        <div className="creation-card-image">
		                          {/* eslint-disable-next-line @next/next/no-img-element */}
		                          <img
		                            src={url}
		                            alt={`Edited image ${i + 1}`}
		                            className="creation-card-img"
		                          />
		                          <div className="creation-card-overlay">
                                <button
                                  type="button"
                                  className="creation-card-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(url);
                                  }}
                                  aria-label="View full size"
                                >
                                  <ImageIcon size={16} />
                                </button>
		                            <button
		                              type="button"
		                              className="creation-card-action-btn"
	                              onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadImage(url);
                                  }}
	                              aria-label="Download image"
	                            >
	                              <Download size={16} />
	                            </button>
	                          </div>
	                        </div>
	                      </div>
	                    ))}

	                    {generationError && (
	                      <div className="creation-empty-state">
	                        <p className="text-red-400">Generation failed</p>
	                        <span>{generationError}</span>
	                      </div>
	                    )}

	                    {!isGenerating && generatedImages.length === 0 && !generationError && (
	                      <div className="creation-empty-state">
	                        <ImageIcon size={48} />
	                        <p>No creations yet</p>
	                        <span>Your edited images will appear here</span>
	                      </div>
	                    )}
	                  </div>
	                )}
	              </div>
	            </div>
	          </div>

          <EditImageSeoBlock />
        </main>
      </div>

      {/* Lightbox for full-size image viewing */}
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
                handleDownloadImage(lightboxImage);
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
    </SidebarProvider>
  );
}
