'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

type DecorationType = 'AVATAR_FRAME' | 'AVATAR_GLOW' | 'AVATAR_EFFECT' | 'BANNER';

type UserDecorationItem = {
  id: string;
  isEquipped: boolean;
  acquiredAt: string;
  decoration: {
    id: string;
    name: string;
    description: string | null;
    type: DecorationType;
    imageUrl: string;
    cssClass: string | null;
    isPremium: boolean;
    price: number | null;
  };
};

type DecorationCategory = 'avatar' | 'background';

function ProfileEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
    </div>
  );
}

export default function PublicProfileDecorationsTab({
  userId,
  avatarInitial,
}: {
  userId: string;
  avatarInitial: string;
}) {
  const { headers } = useUser();

  const [items, setItems] = useState<UserDecorationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<DecorationCategory>('avatar');
  const [previewItem, setPreviewItem] = useState<UserDecorationItem | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/user/${userId}/decorations`, { headers });
        if (!response.ok) {
          setError('Failed to load decorations.');
          return;
        }
        const data = (await response.json()) as { items?: UserDecorationItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        setError('Failed to load decorations.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [headers, userId]);

  const avatarItems = useMemo(
    () => items.filter((item) => item.decoration.type !== 'BANNER'),
    [items]
  );

  const backgroundItems = useMemo(
    () => items.filter((item) => item.decoration.type === 'BANNER'),
    [items]
  );

  const selectedItems = category === 'background' ? backgroundItems : avatarItems;

  const closeModal = useCallback(() => setPreviewItem(null), []);

  useEffect(() => {
    if (!previewItem) return;

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
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [closeModal, previewItem]);

  if (loading) {
    return <div className="gallery-loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="gallery-empty-state">
        <h3 className="gallery-empty-title">Something went wrong</h3>
        <p className="gallery-empty-subtitle">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <ProfileEmptyState
        title="No decorations yet"
        subtitle="This user doesn't own any decorations yet."
      />
    );
  }

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
          Avatar Decorations
          <span className="profile-decoration-tab-count">{avatarItems.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={category === 'background'}
          className={cn('profile-decoration-tab', category === 'background' && 'profile-decoration-tab-active')}
          onClick={() => setCategory('background')}
        >
          Profile Backgrounds
          <span className="profile-decoration-tab-count">{backgroundItems.length}</span>
        </button>
      </div>

      <div className="profile-decoration-grid" aria-label="Decorations grid">
        {selectedItems.map((item) => {
          const unoptimized = item.decoration.imageUrl.startsWith('data:');
          const aspectClass =
            item.decoration.type === 'BANNER'
              ? 'profile-decoration-item-background'
              : 'profile-decoration-item-avatar';

          return (
            <button
              key={item.id}
              type="button"
              className={cn('profile-decoration-item', aspectClass, item.isEquipped && 'profile-decoration-item-active')}
              onClick={() => setPreviewItem(item)}
            >
              {item.decoration.type === 'BANNER' ? (
                <>
                  <Image
                    src={item.decoration.imageUrl}
                    alt={item.decoration.name}
                    fill
                    sizes="(max-width: 768px) 90vw, 420px"
                    className="profile-decoration-image"
                    unoptimized={unoptimized}
                  />
                  <span className="profile-decoration-badge">{item.isEquipped ? 'Equipped' : 'Owned'}</span>
                </>
              ) : (
                <div className="profile-decoration-avatar-thumb">
                  <div className="profile-avatar profile-avatar-decorated profile-decoration-avatar-inner" aria-hidden="true">
                    <span className="profile-avatar-initial">{avatarInitial}</span>
                    <Image
                      src={item.decoration.imageUrl}
                      alt=""
                      fill
                      sizes="120px"
                      className="profile-avatar-decoration"
                      unoptimized={unoptimized}
                    />
                  </div>
                  <span className="profile-decoration-badge">{item.isEquipped ? 'Equipped' : 'Owned'}</span>
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
              <h3>{previewItem.decoration.name}</h3>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="profile-decor-modal-body">
              {previewItem.decoration.type === 'BANNER' ? (
                <div className="profile-decor-preview profile-decor-preview-background">
                  <Image
                    src={previewItem.decoration.imageUrl}
                    alt={previewItem.decoration.name}
                    fill
                    sizes="(max-width: 768px) 90vw, 640px"
                    className="profile-decor-preview-image"
                    unoptimized={previewItem.decoration.imageUrl.startsWith('data:')}
                  />
                </div>
              ) : (
                <div className="profile-decor-preview profile-decor-preview-avatar">
                  <div className="profile-avatar profile-avatar-decorated profile-decor-avatar" aria-hidden="true">
                    <span className="profile-avatar-initial">{avatarInitial}</span>
                    <Image
                      src={previewItem.decoration.imageUrl}
                      alt=""
                      fill
                      sizes="160px"
                      className="profile-avatar-decoration"
                      unoptimized={previewItem.decoration.imageUrl.startsWith('data:')}
                    />
                  </div>
                </div>
              )}

              <div className="profile-decor-modal-actions">
                <button type="button" className="btn-primary profile-decor-use-btn" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

