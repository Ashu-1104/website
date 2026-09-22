'use client';
/* eslint-disable @next/next/no-img-element */

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Heart,
  Image as ImageIcon,
  Info,
  MessageCircle,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DETAILS_PLACEHOLDER_IMAGE_URL } from '@/data/chatCharacterProfiles';
import type { ChatCharacterProfile, ChatCharacterSettings, ChatContact, ChatStats } from '@/types/chat';

type GeneratedMedia = {
  url: string;
  type: 'image' | 'video';
  createdAt: number;
};

type ChatContactDetailsPanelProps = {
  contact: ChatContact;
  profile: ChatCharacterProfile;
  stats: ChatStats;
  settings: ChatCharacterSettings;
  avatarUrls?: string[];
  myGenerations?: GeneratedMedia[];
  onToggleLike: () => void;
  onNewChat: () => void;
  onUpdateSettings: (partial: Partial<ChatCharacterSettings>) => void;
};

function formatCompactCount(value: number): string {
  if (value < 1000) return `${value}`;
  const thousands = value / 1000;
  if (thousands < 1000) return `${thousands.toFixed(thousands < 10 ? 1 : 0)}K`;
  const millions = value / 1_000_000;
  return `${millions.toFixed(millions < 10 ? 1 : 0)}M`;
}

type DetailsTab = 'media' | 'profile' | 'settings';
type MediaTab = 'community' | 'mine';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function DetailsModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Close on Escape for better UX/accessibility.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="chat-details-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="chat-details-modal-scrim" onClick={onClose} />
      <div className="chat-details-modal-card">
        <div className="chat-details-modal-header">
          <h4 className="chat-details-modal-title">{title}</h4>
          <button
            type="button"
            className="chat-details-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="chat-details-modal-close-icon" />
          </button>
        </div>
        <div className="chat-details-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function ChatContactDetailsPanel({
  contact,
  profile,
  stats,
  settings,
  avatarUrls: avatarUrlsProp,
  myGenerations = [],
  onToggleLike,
  onNewChat,
  onUpdateSettings,
}: ChatContactDetailsPanelProps) {
  const [tab, setTab] = useState<DetailsTab>('media');
  const [mediaTab, setMediaTab] = useState<MediaTab>('community');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build hero images list from avatarUrls prop or fallback to single avatar
  const heroImages = useMemo(() => {
    if (avatarUrlsProp && avatarUrlsProp.length > 0) return avatarUrlsProp;
    const fallback = contact.avatarUrl || DETAILS_PLACEHOLDER_IMAGE_URL;
    return [fallback];
  }, [avatarUrlsProp, contact.avatarUrl]);

  const hasMultipleHeroImages = heroImages.length > 1;

  // Combine profile myImages with dynamic myGenerations
  const myGeneratedImages = useMemo(() => {
    const dynamicUrls = myGenerations.map((g) => g.url);
    // Include profile.myImages as fallback/additional images
    return [...dynamicUrls, ...profile.myImages];
  }, [myGenerations, profile.myImages]);

  // When switching characters/tabs, reset the scroll so the hero image is visible again.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setHeroIndex(0);
  }, [contact.id, tab]);

  const formatted = useMemo(() => {
    return {
      viewsLabel: formatCompactCount(stats.views),
      likesLabel: formatCompactCount(stats.likes),
      conversationsLabel: formatCompactCount(stats.conversations),
    };
  }, [stats.conversations, stats.likes, stats.views]);

  const handleCopySystemPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profile.systemPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback: select + copy.
      try {
        const textarea = document.getElementById('chat-system-prompt-textarea') as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }
      } catch {
        // no-op
      }
    }
  }, [profile.systemPrompt]);

  const handleTemperatureChange = useCallback(
    (next: number) => {
      onUpdateSettings({ temperature: clamp(next, 0, 2) });
    },
    [onUpdateSettings]
  );

  const handleMaxMessageLengthChange = useCallback(
    (next: number) => {
      onUpdateSettings({ maxMessageLength: clamp(next, 100, 5000) });
    },
    [onUpdateSettings]
  );

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
      window.open(imageUrl, '_blank');
    }
  }, []);

  return (
    <aside className="chat-panel chat-panel-right" aria-label="Contact details">
      <div className="chat-details">
        <div
          ref={scrollRef}
          className="chat-details-scroll"
          aria-label="Details scroll area"
        >
          <div className="chat-details-hero">
            {/\.mp4/i.test(heroImages[heroIndex] ?? '') ? (
              <video
                key={heroImages[heroIndex]}
                src={heroImages[heroIndex]}
                autoPlay
                loop
                muted
                playsInline
                className="chat-details-hero-image"
                style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute' }}
              />
            ) : (
              <Image
                key={heroImages[heroIndex]}
                src={heroImages[heroIndex] || DETAILS_PLACEHOLDER_IMAGE_URL}
                alt={contact.name}
                fill
                sizes="360px"
                className="chat-details-hero-image"
              />
            )}
            <div className="chat-details-hero-overlay">
              {hasMultipleHeroImages && (
                <>
                  <button
                    type="button"
                    className="chat-details-hero-nav chat-details-hero-nav-prev"
                    onClick={() => setHeroIndex((i) => (i - 1 + heroImages.length) % heroImages.length)}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="chat-details-hero-nav chat-details-hero-nav-next"
                    onClick={() => setHeroIndex((i) => (i + 1) % heroImages.length)}
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="chat-details-hero-indicator">
                    {heroIndex + 1} / {heroImages.length}
                  </div>
                </>
              )}
            </div>

            <div className="chat-details-hero-content">
              <div className="chat-details-name-row">
                <h3 className="chat-details-name">{contact.name}</h3>
                <button
                  type="button"
                  className={cn('chat-details-like', stats.isLiked && 'chat-details-like-active')}
                  onClick={onToggleLike}
                  aria-label={stats.isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className="chat-details-like-icon" />
                </button>
              </div>

              <div className="chat-details-stats" aria-label="Contact stats">
                <div className="chat-details-stat">
                  <Eye className="chat-details-stat-icon" aria-hidden="true" />
                  <span className="chat-details-stat-value">{formatted.viewsLabel}</span>
                </div>
                <span className="chat-details-stat-sep" aria-hidden="true">
                  |
                </span>
                <button
                  type="button"
                  className="chat-details-stat chat-details-stat-like"
                  onClick={onToggleLike}
                  aria-label={stats.isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart
                    className={cn(
                      'chat-details-stat-icon',
                      stats.isLiked && 'chat-details-stat-icon-like-active'
                    )}
                    aria-hidden="true"
                  />
                  <span className="chat-details-stat-value">{formatted.likesLabel}</span>
                </button>
                <span className="chat-details-stat-sep" aria-hidden="true">
                  |
                </span>
                <div className="chat-details-stat">
                  <MessageCircle className="chat-details-stat-icon" aria-hidden="true" />
                  <span className="chat-details-stat-value">{formatted.conversationsLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="chat-details-tabs" aria-label="Details tabs">
            <button
              type="button"
              className={cn('chat-details-tab', tab === 'media' && 'chat-details-tab-active')}
              aria-label="Media"
              onClick={() => setTab('media')}
            >
              <ImageIcon className="chat-details-tab-icon" />
            </button>
            <button
              type="button"
              className={cn('chat-details-tab', tab === 'profile' && 'chat-details-tab-active')}
              aria-label="Profile"
              onClick={() => setTab('profile')}
            >
              <User className="chat-details-tab-icon" />
            </button>
            <button
              type="button"
              className={cn('chat-details-tab', tab === 'settings' && 'chat-details-tab-active')}
              aria-label="Settings"
              onClick={() => setTab('settings')}
            >
              <Settings className="chat-details-tab-icon" />
            </button>
          </nav>

          <div className="chat-details-content" aria-label="Details content">
            {tab === 'settings' && (
              <>
                <div className="chat-details-actions" aria-label="Contact actions">
                  <button
                    type="button"
                    className="chat-details-action chat-details-action-primary"
                    onClick={onNewChat}
                  >
                    <span>New Chat</span>
                    <PlusCircle className="chat-details-action-icon" />
                  </button>

                  <button
                    type="button"
                    className="chat-details-action"
                    onClick={() => setIsVoiceOpen(true)}
                  >
                    <span>Voice Settings</span>
                    <Volume2 className="chat-details-action-icon" />
                  </button>

                  <button
                    type="button"
                    className="chat-details-action"
                    onClick={() => setIsSystemPromptOpen(true)}
                  >
                    <span>System Prompt</span>
                    <ChevronRight className="chat-details-action-icon" />
                  </button>
                </div>

                <section className="chat-details-params" aria-label="Parameters">
                  <div className="chat-details-params-header">
                    <div className="chat-details-params-title">
                      <SlidersHorizontal className="chat-details-params-title-icon" />
                      <span>Parameters</span>
                    </div>
                  </div>

                  <div className="chat-details-param">
                    <div className="chat-details-param-label-row">
                      <span className="chat-details-param-label">Temperature</span>
                      <button
                        type="button"
                        className="chat-details-tooltip"
                        aria-label="Temperature info"
                        data-tooltip="Temperature affects character behavior; a lower temperature makes the character more rigid, while setting it too high (> 1) may negatively affect response quality."
                      >
                        <Info className="chat-details-tooltip-icon" />
                      </button>
                      <span className="chat-details-param-value">
                        {settings.temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={settings.temperature}
                      className="chat-details-slider"
                      onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                      aria-label="Temperature"
                    />
                  </div>

                  <div className="chat-details-param">
                    <div className="chat-details-param-label-row">
                      <span className="chat-details-param-label">Maximum Message Length</span>
                      <span className="chat-details-param-value">{settings.maxMessageLength}</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={5000}
                      step={50}
                      value={settings.maxMessageLength}
                      className="chat-details-slider"
                      onChange={(e) => handleMaxMessageLengthChange(Number(e.target.value))}
                      aria-label="Maximum message length"
                    />
                    <div className="chat-details-number-row">
                      <input
                        type="number"
                        min={100}
                        max={5000}
                        step={50}
                        value={settings.maxMessageLength}
                        className="chat-details-number"
                        onChange={(e) => handleMaxMessageLengthChange(Number(e.target.value))}
                        aria-label="Maximum message length value"
                      />
                      <span className="chat-details-number-hint">
                        min 100 · max 5000 · default 1000
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}

            {tab === 'profile' && (
              <div className="chat-details-section" aria-label="Profile">
                <div className="chat-details-field">
                  <div className="chat-details-field-label">Introduction</div>
                  <textarea
                    className="chat-details-textarea"
                    value={profile.introduction}
                    readOnly
                    rows={5}
                  />
                </div>
                <div className="chat-details-field">
                  <div className="chat-details-field-label">Opener</div>
                  <textarea
                    className="chat-details-textarea"
                    value={profile.opener}
                    readOnly
                    rows={4}
                  />
                </div>
              </div>
            )}

            {tab === 'media' && (
              <div className="chat-details-section" aria-label="Images">
                <div className="chat-details-segment">
                  <button
                    type="button"
                    className={cn(
                      'chat-details-segment-btn',
                      mediaTab === 'community' && 'chat-details-segment-btn-active'
                    )}
                    onClick={() => setMediaTab('community')}
                  >
                    Community
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'chat-details-segment-btn',
                      mediaTab === 'mine' && 'chat-details-segment-btn-active'
                    )}
                    onClick={() => setMediaTab('mine')}
                  >
                    My Generation
                  </button>
                </div>

                <div className="chat-details-media-grid" aria-label="Image grid">
                  {mediaTab === 'community' ? (
                    profile.communityImages.map((url, index) => (
                      <button
                        key={`community-${url}-${index}`}
                        type="button"
                        className="chat-details-media-tile chat-details-media-tile-clickable"
                        onClick={() => !(/\.mp4/i.test(url)) && setLightboxImage(url)}
                        aria-label={/\.mp4/i.test(url) ? 'Video' : 'View image'}
                      >
                        {/\.mp4/i.test(url) ? (
                          <video
                            src={url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ objectFit: 'cover', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                          />
                        ) : (
                          <Image
                            src={url}
                            alt="Community image"
                            fill
                            sizes="(max-width: 1024px) 25vw, 120px"
                            className="chat-details-media-image"
                          />
                        )}
                      </button>
                    ))
                  ) : (
                    <>
                      {myGeneratedImages.slice(0, 15).map((url, index) => (
                        <button
                          key={`mine-${url}-${index}`}
                          type="button"
                          className="chat-details-media-tile chat-details-media-tile-clickable"
                          onClick={() => setLightboxImage(url)}
                          aria-label="View image"
                        >
                          <Image
                            src={url}
                            alt="Generated"
                            fill
                            sizes="(max-width: 1024px) 25vw, 120px"
                            className="chat-details-media-image"
                          />
                        </button>
                      ))}
                      {myGeneratedImages.length > 15 && (
                        <a
                          href="/profile?tab=images"
                          className="chat-details-media-tile chat-details-media-show-more"
                          aria-label="Show more images"
                        >
                          <Image
                            src={myGeneratedImages[15]!}
                            alt=""
                            fill
                            sizes="(max-width: 1024px) 25vw, 120px"
                            className="chat-details-media-image"
                          />
                          <div className="chat-details-media-show-more-overlay">
                            <span>+{myGeneratedImages.length - 15}</span>
                            <span className="chat-details-media-show-more-text">Show More</span>
                          </div>
                        </a>
                      )}
                      {myGeneratedImages.length === 0 && (
                        <div className="chat-details-media-empty">
                          <p>No generated images yet</p>
                          <p className="chat-details-media-empty-hint">
                            Use + → AI Image to generate images
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isVoiceOpen && (
          <DetailsModal title="Voice Settings" onClose={() => setIsVoiceOpen(false)}>
            <div className="chat-details-modal-section">
              <div className="chat-details-param-label-row">
                <span className="chat-details-param-label">Voice Speed</span>
                <span className="chat-details-param-value">{settings.voice.rate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={settings.voice.rate}
                className="chat-details-slider"
                onChange={(e) =>
                  onUpdateSettings({
                    voice: { ...settings.voice, rate: Number(e.target.value) },
                  })
                }
                aria-label="Voice speed"
              />
            </div>

            <div className="chat-details-modal-section">
              <div className="chat-details-param-label-row">
                <span className="chat-details-param-label">Voice Pitch</span>
                <span className="chat-details-param-value">{settings.voice.pitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={settings.voice.pitch}
                className="chat-details-slider"
                onChange={(e) =>
                  onUpdateSettings({
                    voice: { ...settings.voice, pitch: Number(e.target.value) },
                  })
                }
                aria-label="Voice pitch"
              />
            </div>
          </DetailsModal>
        )}

        {isSystemPromptOpen && (
          <DetailsModal title="System Prompt" onClose={() => setIsSystemPromptOpen(false)}>
            <div className="chat-details-modal-section">
              <textarea
                id="chat-system-prompt-textarea"
                className="chat-details-textarea chat-details-textarea-mono"
                value={profile.systemPrompt}
                readOnly
                rows={10}
              />
              <button type="button" className="chat-details-copy" onClick={handleCopySystemPrompt}>
                <Copy className="chat-details-copy-icon" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </DetailsModal>
        )}

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
      </div>
    </aside>
  );
}
