'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, ImagePlus, RefreshCw, Video, Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIVideoType, ChatContact, ChatImageStyle, ChatMediaType, ChatMessage, ChatThread, ChatVoiceSettings } from '@/types/chat';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatGeneratingCard from '@/components/chat/ChatGeneratingCard';
import ChatTypingIndicator from '@/components/chat/ChatTypingIndicator';

type ChatConversationPanelProps = {
  contact: ChatContact;
  thread: ChatThread;
  voiceSettings?: ChatVoiceSettings;
  isTyping?: boolean;
  onSendText: (text: string) => void;
  onSendImage: (prompt: string, style: ChatImageStyle) => void;
  onSendMedia: (items: Array<{ file: File; mediaType: ChatMediaType }>) => void;
  onSendVideo?: (type: AIVideoType, file?: File, prompt?: string) => void;
  onSendAIEdit?: (file: File, prompt: string) => void;
  onAskGenerate?: (label: string) => void;
  onAskVideo?: (label: string) => void;
};

const INITIAL_RENDERED_MESSAGES = 30;
const RENDER_MORE_STEP = 30;
const REGENERATE_PREFIX = '__vp_regenerate__:';
const IMAGE_FROM_AI_PREFIX = '__vp_image_from_ai__:';

function safeSpeak(text: string, voiceSettings?: ChatVoiceSettings) {
  // Lightweight placeholder for the speaker icon behavior.
  // Replace with your own TTS API call when integrating real audio generation.
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings?.rate ?? 1;
    utterance.pitch = voiceSettings?.pitch ?? 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // no-op: speech synthesis can fail on some browsers/devices.
  }
}

function formatImageStyleLabel(style?: ChatImageStyle): string {
  if (style === 'realistic') return 'Realistic';
  if (style === 'anime') return 'Anime';
  if (style === 'cartoon') return 'Cartoon';
  return 'Image';
}

export default function ChatConversationPanel({
  contact,
  thread,
  voiceSettings,
  isTyping = false,
  onSendText,
  onSendImage,
  onSendMedia,
  onSendVideo,
  onSendAIEdit,
  onAskGenerate,
  onAskVideo,
}: ChatConversationPanelProps) {
  const backgroundUrl = contact.avatarUrl || '/images/placeholder.svg';

  const [draft, setDraft] = useState('');
  const [imageStyle, setImageStyle] = useState<ChatImageStyle | null>(null);
  const [renderedCount, setRenderedCount] = useState(INITIAL_RENDERED_MESSAGES);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messages = thread.messages;
  const lastMessageId = messages[messages.length - 1]?.id;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset local UI state when switching chats without blocking the initial paint.
  useEffect(() => {
    setRenderedCount(INITIAL_RENDERED_MESSAGES);
    setDraft('');
    setImageStyle(null);
  }, [contact.id]);

  // If the thread is cleared (e.g., "New Chat"), reset local UI state.
  useEffect(() => {
    if (thread.messages.length !== 0) return;
    setRenderedCount(INITIAL_RENDERED_MESSAGES);
    setDraft('');
    setImageStyle(null);
  }, [thread.chatId, thread.messages.length]);

  const visibleMessages = useMemo(() => {
    if (messages.length <= renderedCount) return messages;
    return messages.slice(messages.length - renderedCount);
  }, [messages, renderedCount]);

  const hasMore = messages.length > visibleMessages.length;

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // When switching chats: jump immediately to bottom (no smooth scroll).
  useLayoutEffect(() => {
    scrollToBottom('auto');
  }, [contact.id, scrollToBottom]);

  // When appending messages locally: scroll smoothly.
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, scrollToBottom]);

  // When typing indicator appears: scroll to show it.
  useEffect(() => {
    if (isTyping) {
      scrollToBottom('smooth');
    }
  }, [isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    // Message persistence/DB write should happen in the parent store.
    // This keeps the conversation list + unread indicators consistent.
    // (Fast UI: we optimistically update the thread in-memory.)
    if (imageStyle) {
      // Image mode: send the user's prompt with the selected style.
      onSendImage(trimmed, imageStyle);
    } else {
      onSendText(trimmed);
    }
    setDraft('');
  }, [draft, imageStyle, onSendImage, onSendText]);

  const lastUserTextForRefresh = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'ai') return null;

    for (let index = messages.length - 2; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (!candidate || candidate.role !== 'user') continue;
      const text = candidate.text.trim();
      if (text.length === 0) continue;
      return candidate.text;
    }

    return null;
  }, [messages]);

  const handleRefreshLatestResponse = useCallback(() => {
    if (!lastUserTextForRefresh) return;
    onSendText(`${REGENERATE_PREFIX}${lastUserTextForRefresh}`);
  }, [lastUserTextForRefresh, onSendText]);

  const handleSpeak = useCallback((message: ChatMessage) => {
    safeSpeak(message.text, voiceSettings);
  }, [voiceSettings]);

  const handleDownloadImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  }, []);

  return (
    <section
      className="chat-panel chat-panel-center"
      aria-label="Conversation"
      style={
        {
          // CSS variable lets us keep the background purely in CSS (fast + no layout shifts).
          ['--chat-bg-image' as string]: `url(${backgroundUrl})`,
        } as CSSProperties
      }
    >
      <div className="chat-conversation">
        <div className="chat-conversation-inner">
          <div ref={scrollRef} className="chat-messages" role="log" aria-label="Messages">
            {hasMore && (
              <button
                type="button"
                className="chat-load-earlier"
                onClick={() => setRenderedCount((count) => count + RENDER_MORE_STEP)}
              >
                Load earlier messages
              </button>
            )}

            {visibleMessages.map((message) => (
              <div key={message.id} className="chat-message-block">
                {message.role === 'ai' && message.timestampLabel && (
                  <div className="chat-timestamp" aria-label={`Timestamp ${message.timestampLabel}`}>
                    {message.timestampLabel}
                  </div>
                )}

                <div
                  className={cn(
                    'chat-message-row',
                    message.role === 'user' ? 'chat-message-row-user' : 'chat-message-row-ai'
                  )}
                >
                <div
                  className={cn(
                    'chat-message-bubble',
                    message.role === 'user'
                      ? 'chat-message-bubble-user'
                      : 'chat-message-bubble-ai'
                  )}
                >
                    {(message.kind ?? 'text') === 'image' && message.imageStyle && !message.imageUrl && (
                      <div className="chat-message-image-meta" aria-label="Image generation settings">
                        <span className="chat-message-image-badge">
                          {formatImageStyleLabel(message.imageStyle)}
                        </span>
                      </div>
                    )}
                    {(message.kind ?? 'text') === 'image' && message.imageUrl && (
                      <button
                        type="button"
                        className="chat-message-media-button"
                        onClick={() => setLightboxImage(message.imageUrl!)}
                        aria-label="View full size image"
                      >
                        <img
                          src={message.imageUrl}
                          alt=""
                          className="chat-message-media chat-message-media-image"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    )}
                    {(message.kind ?? 'text') === 'video' && message.imageUrl && (
                      <video
                        src={message.imageUrl}
                        className="chat-message-media chat-message-media-video"
                        controls
                        playsInline
                      />
                    )}
                    {(message.kind ?? 'text') === 'audio' && message.imageUrl && (
                      <audio
                        src={message.imageUrl}
                        className="chat-message-media chat-message-media-audio"
                        controls
                      />
                    )}
                    {(() => {
                      const kind = message.kind ?? 'text';
                      const isMedia = kind === 'image' || kind === 'video';
                      const isGenerating = message.role === 'ai' && isMedia && !message.imageUrl;
                      const isCompletedAiMedia = message.role === 'ai' && isMedia && !!message.imageUrl;

                      if (isGenerating) {
                        const cardType = kind === 'video'
                          ? 'video' as const
                          : message.text.startsWith('Editing')
                            ? 'edit' as const
                            : 'image' as const;
                        return <ChatGeneratingCard type={cardType} />;
                      }

                      // Hide prompt text on completed AI media (keep it on user side)
                      if (isCompletedAiMedia) return null;

                      return message.text ? message.text : null;
                    })()}
                  </div>

                  {message.role === 'ai' && (
                    <button
                      type="button"
                      className="chat-message-speaker"
                      aria-label="Play audio"
                      onClick={() => handleSpeak(message)}
                    >
                      <Volume2 className="chat-message-speaker-icon" />
                    </button>
                  )}
                </div>

                {(() => {
                  const isLatestMessage = message.id === lastMessageId;
                  const isLatestAiText =
                    isLatestMessage && message.role === 'ai' && (message.kind ?? 'text') === 'text' && !isTyping;
                  if (!isLatestAiText) return null;

                  const prompt = message.text.trim();
                  const canUsePrompt = prompt.length > 0;
                  const resolvedImageStyle: ChatImageStyle = imageStyle ?? 'realistic';
                  const canRefresh = Boolean(lastUserTextForRefresh);

                  return (
                    <div className={cn('chat-message-actions-row', 'chat-message-actions-row-ai')}>
                      <div className="chat-message-actions" aria-label="Message actions">
                        <button
                          type="button"
                          className="chat-message-action-btn"
                          aria-label="Refresh response"
                          onClick={handleRefreshLatestResponse}
                          disabled={!canRefresh}
                        >
                          <RefreshCw className="chat-message-action-icon" />
                        </button>
                        <button
                          type="button"
                          className="chat-message-action-btn"
                          aria-label="Generate image"
                          onClick={() => onSendImage(`${IMAGE_FROM_AI_PREFIX}${prompt}`, resolvedImageStyle)}
                          disabled={!canUsePrompt}
                        >
                          <ImagePlus className="chat-message-action-icon" />
                        </button>
                        <button
                          type="button"
                          className="chat-message-action-btn"
                          aria-label="Generate video"
                          onClick={() => onSendVideo?.('text-to-video', undefined, prompt)}
                          disabled={!canUsePrompt || !onSendVideo}
                        >
                          <Video className="chat-message-action-icon" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}

            {isTyping && <ChatTypingIndicator characterName={contact.name} />}
          </div>

          <ChatComposer
            draft={draft}
            imageStyle={imageStyle}
            characterName={contact.name}
            onChangeDraft={setDraft}
            onChangeImageStyle={setImageStyle}
            onSend={handleSend}
            onSendMedia={onSendMedia}
            onAIVideoRequest={onSendVideo}
            onAIEditRequest={onSendAIEdit}
            onAskGenerate={onAskGenerate}
            onAskVideo={onAskVideo}
          />
        </div>
      </div>

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
            <img
              src={lightboxImage}
              alt="Full size preview"
              className="chat-lightbox-image"
            />
          </div>
        </div>
      )}
    </section>
  );
}
