'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { ProfileDecorationItem } from '@/data/profileDecorations';
import { avatarDecorations, profileBackgroundDecorations } from '@/data/profileDecorations';
import { isDataUrl, isGifUrl, isVideoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

type DecorationCategory = 'avatar' | 'background';

export default function ProfileDecorationsTab(props: {
  avatarInitial: string;
  activeBannerUrl: string | null;
  activeAvatarDecorationUrl: string | null;
  onUseBanner: (url: string) => void;
  onUseAvatarDecoration: (url: string) => void;
}) {
  const { avatarInitial, activeAvatarDecorationUrl, activeBannerUrl, onUseAvatarDecoration, onUseBanner } = props;

  const [category, setCategory] = useState<DecorationCategory>('avatar');
  const [previewItem, setPreviewItem] = useState<ProfileDecorationItem | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    if (category === 'background') return profileBackgroundDecorations;
    return avatarDecorations;
  }, [category]);

  const selectedUrl = category === 'background' ? activeBannerUrl : activeAvatarDecorationUrl;

  const closeModal = useCallback(() => setPreviewItem(null), []);

  useEffect(() => {
    if (!previewItem) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (modalRef.current?.contains(target)) return;
      closeModal();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [closeModal, previewItem]);

  const applyPreview = useCallback(() => {
    if (!previewItem) return;
    if (previewItem.kind === 'background') onUseBanner(previewItem.imageUrl);
    else onUseAvatarDecoration(previewItem.imageUrl);
    closeModal();
  }, [closeModal, onUseAvatarDecoration, onUseBanner, previewItem]);

	  const modalTitle = previewItem?.kind === 'background' ? 'Profile Background' : 'Avatar Decorator';
	  const modalActionLabel = previewItem?.kind === 'background' ? 'Use as profile background' : 'Use as profile decorator';
	  const isPreviewInUse = Boolean(previewItem && previewItem.imageUrl === (previewItem.kind === 'background' ? activeBannerUrl : activeAvatarDecorationUrl));

  return (
    <div className="profile-decorations">
      <div className="profile-decoration-tabs" role="tablist" aria-label="Decoration category">
        <button
          type="button"
          role="tab"
          aria-selected={category === 'avatar'}
          className={cn('profile-decoration-tab', category === 'avatar' && 'profile-decoration-tab-active')}
          onClick={() => setCategory('avatar')}
        >
          Avatar Decorator
          <span className="profile-decoration-tab-count">{avatarDecorations.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={category === 'background'}
          className={cn('profile-decoration-tab', category === 'background' && 'profile-decoration-tab-active')}
          onClick={() => setCategory('background')}
        >
          Profile Background
          <span className="profile-decoration-tab-count">{profileBackgroundDecorations.length}</span>
        </button>
      </div>

      <div className="profile-decoration-grid" aria-label="Decorations grid">
	        {items.map((item) => {
	          const isActive = selectedUrl === item.imageUrl;
	          const isVideo = item.kind === 'background' && isVideoUrl(item.imageUrl);
	          const unoptimized = isDataUrl(item.imageUrl) || isGifUrl(item.imageUrl);
	          const aspectClass =
	            item.kind === 'background' ? 'profile-decoration-item-background' : 'profile-decoration-item-avatar';

          return (
            <button
              key={item.id}
              type="button"
              className={cn('profile-decoration-item', aspectClass, isActive && 'profile-decoration-item-active')}
              onClick={() => setPreviewItem(item)}
            >
	              {item.kind === 'background' ? (
	                <>
	                  {isVideo ? (
	                    <video
	                      src={item.imageUrl}
	                      className="profile-decoration-image absolute inset-0 h-full w-full"
	                      muted
	                      playsInline
	                      preload="metadata"
	                      aria-hidden="true"
	                    />
	                  ) : (
	                    <Image
	                      src={item.imageUrl}
	                      alt="Profile background"
	                      fill
	                      sizes="(max-width: 768px) 90vw, 420px"
	                      className="profile-decoration-image"
	                      unoptimized={unoptimized}
	                    />
	                  )}
	                  <span className="profile-decoration-badge">{isActive ? 'In use' : 'Preview'}</span>
	                </>
	              ) : (
	                <div className="profile-decoration-avatar-thumb">
	                  <div className="profile-avatar profile-avatar-decorated profile-decoration-avatar-inner" aria-hidden="true">
	                    <span className="profile-avatar-initial">{avatarInitial}</span>
	                    <Image
	                      src={item.imageUrl}
	                      alt=""
	                      fill
	                      sizes="120px"
	                      className="profile-avatar-decoration"
	                      unoptimized={unoptimized}
	                    />
	                  </div>
	                  <span className="profile-decoration-badge">{isActive ? 'In use' : 'Preview'}</span>
	                </div>
	              )}
            </button>
          );
        })}
      </div>

      {previewItem && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Decoration preview">
          <div ref={modalRef} className="modal-content profile-decor-modal">
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="profile-decor-modal-body">
	              {previewItem.kind === 'background' ? (
	                <div className="profile-decor-preview profile-decor-preview-background">
	                  {isVideoUrl(previewItem.imageUrl) ? (
	                    <video
	                      src={previewItem.imageUrl}
	                      className="profile-decor-preview-image absolute inset-0 h-full w-full"
	                      muted
	                      loop
	                      playsInline
	                      autoPlay
	                      preload="metadata"
	                      aria-hidden="true"
	                    />
	                  ) : (
	                    <Image
	                      src={previewItem.imageUrl}
	                      alt="Profile background preview"
	                      fill
	                      sizes="(max-width: 768px) 90vw, 640px"
	                      className="profile-decor-preview-image"
	                      unoptimized={isDataUrl(previewItem.imageUrl) || isGifUrl(previewItem.imageUrl)}
	                    />
	                  )}
	                </div>
	              ) : (
	                <div className="profile-decor-preview profile-decor-preview-avatar">
	                  <div className="profile-avatar profile-avatar-decorated profile-decor-avatar" aria-hidden="true">
	                    <span className="profile-avatar-initial">{avatarInitial}</span>
	                    <Image
	                      src={previewItem.imageUrl}
	                      alt=""
	                      fill
	                      sizes="160px"
	                      className="profile-avatar-decoration"
	                      unoptimized={isDataUrl(previewItem.imageUrl) || isGifUrl(previewItem.imageUrl)}
	                    />
	                  </div>
	                </div>
	              )}

              <div className="profile-decor-modal-actions">
                <button
                  type="button"
                  className={cn('btn-primary', 'profile-decor-use-btn', isPreviewInUse && 'profile-decor-use-btn-disabled')}
                  onClick={applyPreview}
                  disabled={isPreviewInUse}
                >
                  {isPreviewInUse ? 'Currently in use' : modalActionLabel}
                </button>
                <button type="button" className="profile-decor-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
