'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import {
  ChevronLeft,
  Clapperboard,
  Flame,
  Headphones,
  ImagePlus,
  Images,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Sticker,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatImageStyle, ChatMediaType, AIVideoType } from '@/types/chat';
import styles from './ChatComposerAsk.module.css';

interface ChatComposerDMProps {
  onSend: (content: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onSendMedia?: (items: Array<{ file: File; mediaType: ChatMediaType }>) => void;
  onAIImageRequest?: (style: ChatImageStyle, prompt: string) => void;
  onAIVideoRequest?: (type: AIVideoType, file?: File, prompt?: string) => void;
  onAIEditRequest?: (file: File, prompt: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_COMPOSER_HEIGHT_PX = 120;
const MAX_IMAGES_PER_SEND = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEOS_PER_SEND = 1;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

type MenuState = 'main' | 'ai-image' | 'ai-video';
type AttachmentMode = 'ai-edit' | 'image-to-video' | 'ai-image' | null;

export default function ChatComposerDM({
  onSend,
  onTyping,
  onSendMedia,
  onAIImageRequest,
  onAIVideoRequest,
  onAIEditRequest,
  disabled = false,
  placeholder = 'Message User...',
}: ChatComposerDMProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const attachMenuId = useId();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const wasTypingRef = useRef(false);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [selectedImageStyle, setSelectedImageStyle] = useState<ChatImageStyle | null>(null);

  const imageStyleOptions = [
    { id: 'style-realistic', label: 'Realistic', value: 'realistic' as const, image: 'https://i.ibb.co/SDPqnpjb/9415f246760f4ca80e35611db3d7880a.jpg' },
    { id: 'style-anime', label: 'Anime', value: 'anime' as const, image: 'https://i.ibb.co/1Gb3qZY4/Gemini-Generated-Image-7ul21a7ul21a7ul2.png' },
    { id: 'style-cartoon', label: 'Cartoon', value: 'cartoon' as const, image: 'https://i.ibb.co/Rp5qFFQh/Gemini-Generated-Image-z6nqqtz6nqqtz6nq.png' },
  ];

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT_PX)}px`;
    }
  }, [draft]);

  useEffect(() => {
    return () => {
      if (attachedImageUrl) {
        URL.revokeObjectURL(attachedImageUrl);
      }
    };
  }, [attachedImageUrl]);

  const handleTyping = useCallback(() => {
    if (!wasTypingRef.current) {
      // Debounce the initial "start typing" emission by 300ms
      if (!typingDebounceRef.current) {
        typingDebounceRef.current = setTimeout(() => {
          typingDebounceRef.current = null;
          wasTypingRef.current = true;
          onTyping(true);
        }, 300);
      }
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Cancel pending start-typing emission if user stopped before 300ms
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      if (wasTypingRef.current) {
        onTyping(false);
      }
      wasTypingRef.current = false;
    }, 2000);
  }, [onTyping]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (wasTypingRef.current) onTyping(false);
    };
  }, [onTyping]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      handleTyping();
    },
    [handleTyping]
  );

  const handleRemoveAttachment = useCallback(() => {
    if (attachedImageUrl) {
      URL.revokeObjectURL(attachedImageUrl);
    }
    setAttachedImage(null);
    setAttachedImageUrl(null);
    setAttachmentMode(null);
    setSelectedImageStyle(null);
  }, [attachedImageUrl]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();

    // Handle AI requests with attachments
    if (attachmentMode && content) {
      if (attachmentMode === 'ai-edit' && attachedImage) {
        onAIEditRequest?.(attachedImage, content);
        handleRemoveAttachment();
        setDraft('');
        return;
      }
      if (attachmentMode === 'image-to-video' && attachedImage) {
        onAIVideoRequest?.('image-to-video', attachedImage, content);
        handleRemoveAttachment();
        setDraft('');
        return;
      }
      if (attachmentMode === 'ai-image' && selectedImageStyle) {
        onAIImageRequest?.(selectedImageStyle, content);
        handleRemoveAttachment();
        setDraft('');
        return;
      }
    }

    if (!content || isSending || disabled) return;

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = null;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (wasTypingRef.current) {
      wasTypingRef.current = false;
      onTyping(false);
    }

    setIsSending(true);
    setDraft('');

    try {
      await onSend(content);
    } catch {
      setDraft(content);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [draft, attachmentMode, attachedImage, selectedImageStyle, isSending, disabled, onSend, onTyping, onAIEditRequest, onAIVideoRequest, onAIImageRequest, handleRemoveAttachment]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const getVideoDuration = useCallback(async (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : null;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      video.src = url;
    });
  }, []);

  const handleMediaFileInput = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (files.length === 0) return;

      const images = files.filter((f) => f.type.startsWith('image/'));
      const videos = files.filter((f) => f.type.startsWith('video/'));

      if (images.length === 0 && videos.length === 0) {
        showToast('Please select image or video files.');
        return;
      }

      const items: Array<{ file: File; mediaType: ChatMediaType }> = [];

      const limitedImages = images.slice(0, MAX_IMAGES_PER_SEND);
      if (images.length > MAX_IMAGES_PER_SEND) {
        showToast(`Max ${MAX_IMAGES_PER_SEND} images at a time.`);
      }

      for (const file of limitedImages) {
        if (file.size > MAX_IMAGE_BYTES) {
          showToast(`"${file.name}" is too large (max 10MB).`);
          continue;
        }
        items.push({ file, mediaType: 'IMAGE' });
      }

      const limitedVideos = videos.slice(0, MAX_VIDEOS_PER_SEND);
      if (videos.length > MAX_VIDEOS_PER_SEND) {
        showToast(`Max ${MAX_VIDEOS_PER_SEND} video at a time.`);
      }

      for (const file of limitedVideos) {
        if (file.size > MAX_VIDEO_BYTES) {
          showToast(`"${file.name}" is too large (max 60MB).`);
          continue;
        }
        const duration = await getVideoDuration(file);
        if (duration === null) {
          showToast(`Could not read "${file.name}".`);
          continue;
        }
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          showToast(`"${file.name}" is too long (max ${MAX_VIDEO_DURATION_SECONDS}s).`);
          continue;
        }
        items.push({ file, mediaType: 'VIDEO' });
      }

      if (items.length > 0) {
        onSendMedia?.(items);
        setMenuState(null);
      }
    },
    [getVideoDuration, onSendMedia, showToast]
  );

  const handleAudioFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('audio/')) {
        showToast('Please select an audio file.');
        return;
      }
      if (file.size > MAX_AUDIO_BYTES) {
        showToast('Audio file too large (max 20MB).');
        return;
      }

      onSendMedia?.([{ file, mediaType: 'AUDIO' }]);
      setMenuState(null);
    },
    [onSendMedia, showToast]
  );

  const handleImageUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showToast('Image too large (max 10MB).');
        return;
      }

      const url = URL.createObjectURL(file);
      setAttachedImage(file);
      setAttachedImageUrl(url);
      setMenuState(null);
      textareaRef.current?.focus();
    },
    [showToast]
  );

  const closeAllMenus = useCallback(() => {
    setMenuState(null);
  }, []);

  useEffect(() => {
    if (!menuState) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      closeAllMenus();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeAllMenus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState, closeAllMenus]);

  const renderMainMenu = () => (
    <>
      <button type="button" className={styles.attachMenuItem} onClick={() => mediaInputRef.current?.click()}>
        <Images className={cn(styles.attachMenuIcon, styles.attachMenuIconPhotos)} />
        <span>Photos & videos</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => audioInputRef.current?.click()}>
        <Headphones className={cn(styles.attachMenuIcon, styles.attachMenuIconAudio)} />
        <span>Audio</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => setMenuState('ai-image')}>
        <ImagePlus className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} />
        <span>AI Images</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => setMenuState('ai-video')}>
        <Clapperboard className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} />
        <span>AI Videos</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => { setAttachmentMode('ai-edit'); setSelectedImageStyle(null); setMenuState(null); imageUploadRef.current?.click(); }}>
        <Pencil className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} />
        <span>AI Image Edit</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => { setMenuState(null); showToast('GIF picker coming soon.'); }}>
        <Sticker className={cn(styles.attachMenuIcon, styles.attachMenuIconGif)} />
        <span>GIF</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => { setMenuState(null); showToast('NSFW GIF picker coming soon.'); }}>
        <Flame className={cn(styles.attachMenuIcon, styles.attachMenuIconNsfw)} />
        <span>NSFW GIF</span>
      </button>
    </>
  );

  const renderAIImageMenu = () => (
    <>
      <button type="button" className={styles.attachMenuBack} onClick={() => setMenuState('main')}>
        <ChevronLeft className={styles.attachMenuBackIcon} />
        <span>Select Style</span>
      </button>
      <div className={styles.imageStyleGrid}>
        {imageStyleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={styles.imageOption}
            style={{ backgroundImage: `url(${opt.image})` }}
            onClick={() => {
              setSelectedImageStyle(opt.value);
              setAttachmentMode('ai-image');
              // Clear any previously attached image from other modes
              if (attachedImageUrl) URL.revokeObjectURL(attachedImageUrl);
              setAttachedImage(null);
              setAttachedImageUrl(null);
              setMenuState(null);
              textareaRef.current?.focus();
            }}
          >
            <span className={styles.imageOptionLabel}>{opt.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderAIVideoMenu = () => (
    <>
      <button type="button" className={styles.attachMenuBack} onClick={() => setMenuState('main')}>
        <ChevronLeft className={styles.attachMenuBackIcon} />
        <span>AI Video</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => {
        // Clear other modes so only one action is active
        setAttachmentMode(null);
        setSelectedImageStyle(null);
        if (attachedImageUrl) URL.revokeObjectURL(attachedImageUrl);
        setAttachedImage(null);
        setAttachedImageUrl(null);
        onAIVideoRequest?.('text-to-video');
        setMenuState(null);
        showToast('Enter your prompt for AI video');
        textareaRef.current?.focus();
      }}>
        <Sparkles className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} />
        <span>Text to Video</span>
      </button>
      <button type="button" className={styles.attachMenuItem} onClick={() => {
        setAttachmentMode('image-to-video');
        setSelectedImageStyle(null);
        setMenuState(null);
        imageUploadRef.current?.click();
      }}>
        <Upload className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} />
        <span>Image to Video</span>
      </button>
    </>
  );

  const getPlaceholder = () => {
    if (attachmentMode === 'ai-edit') return 'Describe the edit you want...';
    if (attachmentMode === 'image-to-video') return 'Describe the video motion...';
    if (attachmentMode === 'ai-image' && selectedImageStyle) return `Generate ${selectedImageStyle} style image...`;
    return placeholder;
  };

  const getAttachmentLabel = () => {
    if (attachmentMode === 'ai-edit') return 'AI Edit';
    if (attachmentMode === 'image-to-video') return 'Image to Video';
    if (attachmentMode === 'ai-image' && selectedImageStyle) return `AI Image (${selectedImageStyle})`;
    return '';
  };

  const canSend = () => {
    if (attachmentMode === 'ai-image' && selectedImageStyle && draft.trim()) return true;
    if ((attachmentMode === 'ai-edit' || attachmentMode === 'image-to-video') && attachedImage && draft.trim()) return true;
    return draft.trim() && !isSending && !disabled;
  };

  return (
    <div className={cn('chat-composer-wrap', styles.composerWrap)}>
      {toastMessage && (
        <div className={styles.toastWrap} role="status" aria-live="polite">
          <div className={styles.toast}>{toastMessage}</div>
        </div>
      )}
      <div className="chat-composer">
        {(attachedImageUrl || (attachmentMode === 'ai-image' && selectedImageStyle)) && (
          <div className={styles.composerAttachment}>
            <div className={styles.attachmentPreview}>
              {attachedImageUrl ? (
                <img src={attachedImageUrl} alt="Attached" />
              ) : (
                <div className={styles.aiImageStylePreview}>
                  <ImagePlus className={styles.aiImageStyleIcon} />
                </div>
              )}
              <div className={styles.attachmentActions}>
                <button
                  type="button"
                  className={styles.attachmentRemove}
                  onClick={handleRemoveAttachment}
                  aria-label="Remove attachment"
                >
                  <X className={styles.attachmentRemoveIcon} />
                </button>
              </div>
              <div className={styles.attachmentLabel}>{getAttachmentLabel()}</div>
            </div>
          </div>
        )}
        <div className={styles.composerInputRow}>
          <div className={styles.attachWrap}>
            <button
              ref={attachButtonRef}
              type="button"
              className={cn('chat-composer-icon-btn', styles.attachTrigger, menuState && styles.attachTriggerActive)}
              aria-label="Open attachments"
              aria-haspopup="menu"
              aria-expanded={!!menuState}
              aria-controls={attachMenuId}
              onClick={() => { setMenuState((prev) => (prev ? null : 'main')); }}
            >
              <Plus className="chat-composer-icon" />
            </button>

            <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaFileInput} />
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileInput} />
            <input ref={imageUploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {menuState && (
              <div ref={attachMenuRef} id={attachMenuId} className={styles.attachMenu} role="menu">
                {menuState === 'main' && renderMainMenu()}
                {menuState === 'ai-image' && renderAIImageMenu()}
                {menuState === 'ai-video' && renderAIVideoMenu()}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled || isSending}
            rows={1}
            className="chat-composer-input"
          />
          <button
            onClick={handleSend}
            disabled={!canSend()}
            className="chat-composer-send"
            aria-label="Send message"
          >
            <Send className="chat-composer-send-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
