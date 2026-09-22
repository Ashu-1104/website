'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronUp,
  Clapperboard,
  ImagePlus,
  Pencil,
  Plus,
  SendHorizonal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatImageStyle, ChatMediaType, AIVideoType } from '@/types/chat';
import styles from './ChatComposerAsk.module.css';

type ChatComposerProps = {
  draft: string;
  characterName?: string;
  imageStyle: ChatImageStyle | null;
  onChangeDraft: (next: string) => void;
  onChangeImageStyle: (next: ChatImageStyle | null) => void;
  onSend: () => void;
  onSendMedia?: (items: Array<{ file: File; mediaType: ChatMediaType }>) => void;
  onAIVideoRequest?: (type: AIVideoType, file?: File, prompt?: string) => void;
  onAIEditRequest?: (file: File, prompt: string) => void;
  onAskGenerate?: (label: string) => void;
  onAskVideo?: (label: string) => void;
};

const MAX_COMPOSER_HEIGHT_PX = 160;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type MenuState = 'main' | 'ai-image' | 'ai-video';
type AttachmentMode = 'ai-edit' | 'image-to-video' | null;
type VideoMode = 'text-to-video' | null;

export default function ChatComposer({
  draft,
  characterName,
  imageStyle,
  onChangeDraft,
  onChangeImageStyle,
  onSend,
  onAIVideoRequest,
  onAIEditRequest,
  onAskGenerate,
  onAskVideo,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const askMenuRef = useRef<HTMLDivElement>(null);
  const askButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuId = useId();
  const askMenuId = useId();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [isAskMenuOpen, setIsAskMenuOpen] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<VideoMode>(null);

  const resolvedCharacterName = characterName?.trim() || 'Partner';

  const imageStyleOptions = useMemo(
    () => [
      { id: 'image-style-realistic', label: 'Realistic', value: 'realistic' as const, image: 'https://i.ibb.co/SDPqnpjb/9415f246760f4ca80e35611db3d7880a.jpg' },
      { id: 'image-style-anime', label: 'Anime', value: 'anime' as const, image: 'https://i.ibb.co/1Gb3qZY4/Gemini-Generated-Image-7ul21a7ul21a7ul2.png' },
      { id: 'image-style-cartoon', label: 'Cartoon', value: 'cartoon' as const, image: 'https://i.ibb.co/Rp5qFFQh/Gemini-Generated-Image-z6nqqtz6nqqtz6nq.png' },
    ],
    []
  );

  const askOptions = useMemo(
    () => [
      { id: 'option-1', label: '🍒 show me boobs' },
      { id: 'option-2', label: '🐱 show me pussy' },
      { id: 'option-3', label: '🍑 show me ass' },
      { id: 'option-4', label: '🎥 send me video' },
    ],
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const prompt = draft.trim();

      // Handle text-to-video mode
      if (videoMode === 'text-to-video') {
        if (!prompt) {
          setToastMessage('Please enter a prompt.');
          return;
        }
        onAIVideoRequest?.('text-to-video', undefined, prompt);
        setVideoMode(null);
        onChangeDraft('');
        return;
      }

      // Handle image attachment modes (ai-edit, image-to-video)
      if (attachedImage && attachmentMode) {
        if (!prompt) {
          setToastMessage('Please enter a prompt.');
          return;
        }
        if (attachmentMode === 'ai-edit') {
          onAIEditRequest?.(attachedImage, prompt);
        } else if (attachmentMode === 'image-to-video') {
          onAIVideoRequest?.('image-to-video', attachedImage, prompt);
        }
        setAttachedImage(null);
        setAttachedImageUrl(null);
        setAttachmentMode(null);
        onChangeDraft('');
        return;
      }
      onSend();
    },
    [attachedImage, attachmentMode, draft, onAIEditRequest, onAIVideoRequest, onChangeDraft, onSend, videoMode]
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  const syncComposerHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT_PX)}px`;
  }, []);

  const handleImageStyleOption = useCallback(
    (nextStyle: ChatImageStyle) => {
      const newStyle = imageStyle === nextStyle ? null : nextStyle;
      onChangeImageStyle(newStyle);
      // Clear other modes so only one action is active at a time
      if (newStyle) {
        setAttachmentMode(null);
        setVideoMode(null);
        if (attachedImageUrl) URL.revokeObjectURL(attachedImageUrl);
        setAttachedImage(null);
        setAttachedImageUrl(null);
      }
      setMenuState(null);
      inputRef.current?.focus();
    },
    [imageStyle, onChangeImageStyle, attachedImageUrl]
  );

  const handleAIVideoTextOption = useCallback(() => {
    setVideoMode('text-to-video');
    // Clear other modes so only one action is active at a time
    onChangeImageStyle(null);
    setAttachmentMode(null);
    if (attachedImageUrl) URL.revokeObjectURL(attachedImageUrl);
    setAttachedImage(null);
    setAttachedImageUrl(null);
    setMenuState(null);
    inputRef.current?.focus();
  }, [onChangeImageStyle, attachedImageUrl]);

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
        showToast('Image is too large (max 10MB).');
        return;
      }

      const url = URL.createObjectURL(file);
      setAttachedImage(file);
      setAttachedImageUrl(url);
      setMenuState(null);
      inputRef.current?.focus();
    },
    [showToast]
  );

  const handleRemoveAttachment = useCallback(() => {
    if (attachedImageUrl) {
      URL.revokeObjectURL(attachedImageUrl);
    }
    setAttachedImage(null);
    setAttachedImageUrl(null);
    setAttachmentMode(null);
  }, [attachedImageUrl]);

  const handleAskOption = useCallback(
    (label: string) => {
      setIsAskMenuOpen(false);
      // Video option → trigger video generation directly
      if (label.includes('video') && onAskVideo) {
        onAskVideo(label);
        return;
      }
      // Image options → trigger image generation directly
      if (onAskGenerate) {
        onAskGenerate(label);
        return;
      }
      // Fallback: prefill draft
      onChangeDraft(label);
      inputRef.current?.focus();
    },
    [onAskGenerate, onAskVideo, onChangeDraft]
  );

  const closeAllMenus = useCallback(() => {
    setMenuState(null);
    setIsAskMenuOpen(false);
  }, []);

  useEffect(() => {
    syncComposerHeight();
  }, [draft, syncComposerHeight]);

  useEffect(() => {
    return () => {
      if (attachedImageUrl) {
        URL.revokeObjectURL(attachedImageUrl);
      }
    };
  }, [attachedImageUrl]);

  useEffect(() => {
    if (!isAskMenuOpen && !menuState) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (askMenuRef.current?.contains(target)) return;
      if (askButtonRef.current?.contains(target)) return;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      closeAllMenus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      closeAllMenus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAskMenuOpen, menuState, closeAllMenus]);

  const renderMainMenu = () => (
    <>
      <button
        type="button"
        className={styles.attachMenuItem}
        role="menuitem"
        onClick={() => setMenuState('ai-image')}
      >
        <ImagePlus className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} aria-hidden="true" />
        <span>AI Image</span>
      </button>
      <button
        type="button"
        className={styles.attachMenuItem}
        role="menuitem"
        onClick={() => setMenuState('ai-video')}
      >
        <Clapperboard className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} aria-hidden="true" />
        <span>AI Video</span>
      </button>
      <button
        type="button"
        className={styles.attachMenuItem}
        role="menuitem"
        onClick={() => {
          setAttachmentMode('ai-edit');
          // Clear other modes so only one action is active at a time
          onChangeImageStyle(null);
          setVideoMode(null);
          setMenuState(null);
          imageUploadRef.current?.click();
        }}
      >
        <Pencil className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} aria-hidden="true" />
        <span>AI Edit</span>
      </button>
    </>
  );

  const renderAIImageMenu = () => (
    <>
      <button
        type="button"
        className={styles.attachMenuBack}
        onClick={() => setMenuState('main')}
      >
        <ChevronLeft className={styles.attachMenuBackIcon} aria-hidden="true" />
        <span>Select Style</span>
      </button>
      <div className={styles.imageStyleGrid}>
        {imageStyleOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              styles.imageOption,
              imageStyle === option.value && styles.imageOptionSelected
            )}
            style={{ backgroundImage: `url(${option.image})` }}
            role="menuitemradio"
            aria-checked={imageStyle === option.value}
            onClick={() => handleImageStyleOption(option.value)}
          >
            <span className={styles.imageOptionLabel}>{option.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderAIVideoMenu = () => (
    <>
      <button
        type="button"
        className={styles.attachMenuBack}
        onClick={() => setMenuState('main')}
      >
        <ChevronLeft className={styles.attachMenuBackIcon} aria-hidden="true" />
        <span>AI Video</span>
      </button>
      <button
        type="button"
        className={styles.attachMenuItem}
        role="menuitem"
        onClick={handleAIVideoTextOption}
      >
        <Sparkles className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} aria-hidden="true" />
        <span>Text to Video</span>
      </button>
      <button
        type="button"
        className={styles.attachMenuItem}
        role="menuitem"
        onClick={() => {
          setAttachmentMode('image-to-video');
          // Clear other modes so only one action is active at a time
          onChangeImageStyle(null);
          setVideoMode(null);
          setMenuState(null);
          imageUploadRef.current?.click();
        }}
      >
        <Upload className={cn(styles.attachMenuIcon, styles.attachMenuIconAi)} aria-hidden="true" />
        <span>Image to Video</span>
      </button>
    </>
  );

  const getPlaceholder = () => {
    if (videoMode === 'text-to-video') return 'Describe the video you want to generate...';
    if (attachmentMode === 'ai-edit') return 'Describe the edit you want...';
    if (attachmentMode === 'image-to-video') return 'Describe the video motion...';
    if (imageStyle === 'realistic') return 'Generate realistic style image';
    if (imageStyle === 'anime') return 'Generate anime style image';
    if (imageStyle === 'cartoon') return 'Generate cartoon style image';
    return 'Send a message';
  };

  return (
    <div className={cn('chat-composer-wrap', styles.composerWrap)}>
      {toastMessage && (
        <div className={styles.toastWrap} role="status" aria-live="polite">
          <div className={styles.toast}>{toastMessage}</div>
        </div>
      )}
      <form className="chat-composer" onSubmit={handleSubmit}>
        {imageStyle && (
          <div className={styles.composerModeBadge}>
            <ImagePlus className={styles.modeBadgeIcon} aria-hidden="true" />
            <span className={styles.modeBadgeText}>AI Image</span>
            <button
              type="button"
              className={styles.modeBadgeClose}
              onClick={() => onChangeImageStyle(null)}
              aria-label="Cancel image mode"
            >
              <X className={styles.modeBadgeCloseIcon} />
            </button>
          </div>
        )}
        {attachmentMode === 'ai-edit' && !attachedImage && (
          <div className={styles.composerModeBadge}>
            <Pencil className={styles.modeBadgeIcon} aria-hidden="true" />
            <span className={styles.modeBadgeText}>AI Edit</span>
            <button
              type="button"
              className={styles.modeBadgeClose}
              onClick={() => setAttachmentMode(null)}
              aria-label="Cancel edit mode"
            >
              <X className={styles.modeBadgeCloseIcon} />
            </button>
          </div>
        )}
        {attachmentMode === 'image-to-video' && !attachedImage && (
          <div className={styles.composerModeBadge}>
            <Clapperboard className={styles.modeBadgeIcon} aria-hidden="true" />
            <span className={styles.modeBadgeText}>AI Video</span>
            <button
              type="button"
              className={styles.modeBadgeClose}
              onClick={() => setAttachmentMode(null)}
              aria-label="Cancel video mode"
            >
              <X className={styles.modeBadgeCloseIcon} />
            </button>
          </div>
        )}
        {videoMode === 'text-to-video' && (
          <div className={styles.composerModeBadge}>
            <Clapperboard className={styles.modeBadgeIcon} aria-hidden="true" />
            <span className={styles.modeBadgeText}>Text to Video</span>
            <button
              type="button"
              className={styles.modeBadgeClose}
              onClick={() => setVideoMode(null)}
              aria-label="Cancel video mode"
            >
              <X className={styles.modeBadgeCloseIcon} />
            </button>
          </div>
        )}
        {attachedImageUrl && (
          <div className={styles.composerAttachment}>
            <div className={styles.attachmentPreview}>
              <img src={attachedImageUrl} alt="Attached" />
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
              <div className={styles.attachmentLabel}>
                {attachmentMode === 'ai-edit' ? 'AI Edit' : 'Image to Video'}
              </div>
            </div>
          </div>
        )}
        <div className={styles.composerInputRow}>
          <div className={styles.attachWrap}>
            <button
              ref={attachButtonRef}
              type="button"
              className={cn(
                'chat-composer-icon-btn chat-composer-tooltip',
                styles.attachTrigger,
                menuState && styles.attachTriggerActive
              )}
              aria-label="Open AI tools"
              data-tooltip="AI Tools"
              aria-haspopup="menu"
              aria-expanded={!!menuState}
              aria-controls={attachMenuId}
              onClick={() => {
                setMenuState((prev) => (prev ? null : 'main'));
                setIsAskMenuOpen(false);
              }}
            >
              <Plus className="chat-composer-icon" />
            </button>

            <input
              ref={imageUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {menuState && (
              <div
                ref={attachMenuRef}
                id={attachMenuId}
                className={styles.attachMenu}
                role="menu"
                aria-label="AI Tools"
              >
                {menuState === 'main' && renderMainMenu()}
                {menuState === 'ai-image' && renderAIImageMenu()}
                {menuState === 'ai-video' && renderAIVideoMenu()}
              </div>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (e.shiftKey) return;
              if (e.nativeEvent.isComposing) return;
              if (!draft.trim() && !attachedImage && !videoMode) return;
              e.preventDefault();
              handleSubmit(e);
            }}
            className="chat-composer-input"
            placeholder={getPlaceholder()}
            aria-label="Message"
            rows={1}
          />

          <div className="chat-composer-actions">
            <div className={styles.askWrap}>
              <button
                ref={askButtonRef}
                type="button"
                className={cn(styles.askTrigger, isAskMenuOpen && styles.askTriggerOpen)}
                aria-haspopup="menu"
                aria-expanded={isAskMenuOpen}
                aria-controls={askMenuId}
                onClick={() => {
                  setIsAskMenuOpen((open) => !open);
                  setMenuState(null);
                }}
              >
                <Sparkles className={styles.askIcon} aria-hidden="true" />
                <span className={styles.askLabel}>Ask</span>
                <ChevronUp
                  className={cn(styles.askChevron, isAskMenuOpen && styles.askChevronOpen)}
                  aria-hidden="true"
                />
              </button>

              {isAskMenuOpen && (
                <div
                  ref={askMenuRef}
                  id={askMenuId}
                  className={styles.askMenu}
                  role="menu"
                  aria-label={`Ask ${resolvedCharacterName}`}
                >
                  <div className={styles.askMenuHeader}>{`Ask ${resolvedCharacterName}`}</div>
                  <div className={styles.askMenuList} role="none">
                    {askOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.askMenuItem}
                        role="menuitem"
                        onClick={() => handleAskOption(option.label)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className={cn('chat-composer-send', (!draft.trim() && !attachedImage && !videoMode) && 'chat-composer-send-disabled')}
              aria-label="Send message"
              disabled={!draft.trim() && !attachedImage}
            >
              <SendHorizonal className="chat-composer-send-icon" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
