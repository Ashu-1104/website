'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Headphones, Heart, Image as ImageIcon, MessageCircle, Sparkles, UserCheck, UserPlus, Users, Video, Wrench } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import { useLocalUser } from '@/components/community/useLocalUser';
import { useLocalProfileSettings } from '@/components/profile/useLocalProfile';
import { useAuth } from '@/hooks/useAuth';
import { AIPartnerGrid, ImageGrid, VideoGrid } from '@/components/gallery/GalleryGrids';
import { avatarDecorations, profileBackgroundDecorations } from '@/data/profileDecorations';
import type { AICharacter, GalleryTab, GeneratedImage, GeneratedVideo } from '@/types';
import { readIdSet, writeIdSet } from '@/lib/idSetStorage';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { isDataUrl, isGifUrl, isVideoUrl } from '@/lib/media';
import { FAVORITES_UPDATED_EVENT, readFavoriteIds } from '@/lib/favorites';
import { readLikedChatIds } from '@/lib/chat/localStats';

type ExtraProfileTab = 'models' | 'favorites' | 'ai-audio' | 'ai-tools' | 'decoration';
type ProfileTab = GalleryTab | ExtraProfileTab;

const ProfileModelsTab = dynamic(() => import('@/components/profile/ProfileModelsTab'), {
  ssr: false,
  loading: () => <div className="gallery-loading">Loading...</div>,
});

const ProfileDecorationsTab = dynamic(() => import('@/components/profile/ProfileDecorationsTab'), {
  ssr: false,
  loading: () => <div className="gallery-loading">Loading...</div>,
});

const ProfileFavoritesTab = dynamic(() => import('@/components/profile/ProfileFavoritesTab'), {
  ssr: false,
  loading: () => <div className="gallery-loading">Loading...</div>,
});

function ProfileEmptyState({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="gallery-generate-btn">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, isAuthenticated } = useAuth();
  const { handle: localHandle, userId: localUserId } = useLocalUser();
  const { profile, updateProfile, avatarDecorationClassName } = useLocalProfileSettings();

  // Prefer auth user data over local/legacy data
  const handle = isAuthenticated && authUser?.handle ? authUser.handle : localHandle;
  const userId = isAuthenticated && authUser?.id ? authUser.id : localUserId;

  const [partners, setPartners] = useState<AICharacter[]>([]);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount] = useState(0);
  const [uploadedModelsCount, setUploadedModelsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);

  const images = useMemo<GeneratedImage[]>(() => [], []);
  const videos = useMemo<GeneratedVideo[]>(() => [], []);

  const activeTab = useMemo<ProfileTab>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'videos') return 'videos';
    if (tab === 'partners' || tab === 'characters') return 'partners';
    if (tab === 'models') return 'models';
    if (tab === 'favorites' || tab === 'favourites') return 'favorites';
    if (tab === 'ai-audio') return 'ai-audio';
    if (tab === 'ai-tools') return 'ai-tools';
    if (tab === 'decoration') return 'decoration';
    return 'images';
  }, [searchParams]);

  const setTab = useCallback((tab: ProfileTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.push(`/profile?${next.toString()}`);
  }, [router, searchParams]);

  const displayName = useMemo(() => {
    const name = handle?.trim();
    return name && name.length > 0 ? name : 'User';
  }, [handle]);

  const avatarInitial = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);

  const profileFollowId = useMemo(() => {
    if (handle && handle.trim().length > 0) return `user:${handle.trim()}`;
    if (userId && userId.trim().length > 0) return `user:${userId.trim()}`;
    return '';
  }, [handle, userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchPartners = async () => {
      try {
        const res = await fetch(`/api/characters?userId=${userId}&limit=50&includeNsfw=true`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
        if (cancelled || !Array.isArray(data.items)) return;
        setPartners(
          data.items.map((item) => ({
            id: String(item.id ?? ''),
            userId: String(item.creator && typeof item.creator === 'object' && 'id' in item.creator ? (item.creator as Record<string, unknown>).id : userId),
            name: String(item.name ?? ''),
            image: String(
              (typeof item.characterAvatarUrl === 'string' && item.characterAvatarUrl
                ? item.characterAvatarUrl
                : (item.avatarAsset && typeof item.avatarAsset === 'object' && 'url' in (item.avatarAsset as Record<string, unknown>)
                  ? (item.avatarAsset as Record<string, unknown>).url
                  : '')) ?? ''
            ),
            description: typeof item.description === 'string' ? item.description : undefined,
            createdAt: new Date(String(item.createdAt)),
            updatedAt: new Date(String(item.createdAt)),
          }))
        );
      } catch { /* ignore */ }
    };
    void fetchPartners();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/models?userId=${userId}&limit=50&publicOnly=false`);
        if (!res.ok) return;
        const data = (await res.json()) as { items?: unknown[] };
        if (cancelled) return;
        setUploadedModelsCount(Array.isArray(data.items) ? data.items.length : 0);
      } catch { /* ignore */ }
    };
    void fetchCount();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const syncCounts = () => {
      const follows = readIdSet('vp_user_follows');
      setFollowingCount(follows.size);
      setIsFollowingProfile(profileFollowId ? follows.has(profileFollowId) : false);

      const models = readFavoriteIds('models');

      const total =
        models.size +
        readFavoriteIds('images').size +
        readFavoriteIds('videos').size +
        readFavoriteIds('ai-audio').size +
        readLikedChatIds().size;
      setFavoritesCount(total);
    };

    syncCounts();
    window.addEventListener(FAVORITES_UPDATED_EVENT, syncCounts);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, syncCounts);
  }, [profileFollowId]);

  const toggleFollowProfile = useCallback(() => {
    if (!profileFollowId) return;
    setIsFollowingProfile((prev) => {
      const next = !prev;
      const follows = readIdSet('vp_user_follows');
      if (next) follows.add(profileFollowId);
      else follows.delete(profileFollowId);
      writeIdSet('vp_user_follows', follows);
      setFollowingCount(follows.size);
      return next;
    });
  }, [profileFollowId]);

  const tabItems = useMemo(() => ([
    { id: 'favorites' as const, label: 'Favorites', icon: Heart, count: favoritesCount },
    { id: 'images' as const, label: 'Image', icon: ImageIcon, count: images.length },
    { id: 'videos' as const, label: 'Video', icon: Video, count: videos.length },
    { id: 'partners' as const, label: 'AI Partners', icon: Users, count: partners.length },
    { id: 'models' as const, label: 'Models', icon: Box, count: uploadedModelsCount },
    { id: 'ai-audio' as const, label: 'AI Audio', icon: Headphones, count: 0 },
    { id: 'ai-tools' as const, label: 'AI Tools', icon: Wrench, count: 0 },
    { id: 'decoration' as const, label: 'Decoration', icon: Sparkles, count: avatarDecorations.length + profileBackgroundDecorations.length },
  ]), [uploadedModelsCount, favoritesCount, images.length, partners.length, videos.length]);

  const bioText =
    (isAuthenticated && authUser?.bio && authUser.bio.length > 0)
      ? authUser.bio
      : (profile.bio && profile.bio.length > 0)
        ? profile.bio
        : 'Totally hooked on AI and all the wild things it can do. Not an artist — just exploring, learning, and sharing what I make.';

  const bannerUrl = (isAuthenticated && authUser?.bannerUrl) ? authUser.bannerUrl : (profile.bannerUrl ?? profile.bannerDataUrl ?? null);
  const bannerIsDataUrl = isDataUrl(bannerUrl);
  const bannerIsGif = isGifUrl(bannerUrl);
  const bannerIsVideo = isVideoUrl(bannerUrl);
  const avatarDecorationUrl = profile.avatarDecorationUrl ?? null;
  const avatarIsDecorated = Boolean(avatarDecorationUrl);
  const avatarDecorationUnoptimized = isDataUrl(avatarDecorationUrl) || isGifUrl(avatarDecorationUrl);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'images':
        return <ImageGrid images={images} />;
      case 'videos':
        return <VideoGrid videos={videos} />;
      case 'partners':
        return <AIPartnerGrid partners={partners} />;
      case 'models':
        return <ProfileModelsTab />;
      case 'favorites':
        return <ProfileFavoritesTab images={images} videos={videos} />;
      case 'ai-audio':
        return (
          <ProfileEmptyState
            title="No AI audio yet"
            subtitle="Your saved audio generations will show up here."
          />
        );
      case 'ai-tools':
        return (
          <ProfileEmptyState
            title="No AI tools yet"
            subtitle="Your tools, presets, and saved workflows will show up here."
          />
        );
	      case 'decoration':
	        return (
	          <ProfileDecorationsTab
	            avatarInitial={avatarInitial}
	            activeBannerUrl={bannerUrl}
	            activeAvatarDecorationUrl={avatarDecorationUrl}
	            onUseBanner={(url) => updateProfile({ bannerUrl: url, bannerDataUrl: undefined })}
	            onUseAvatarDecoration={(url) => updateProfile({ avatarDecorationUrl: url })}
	          />
	        );
      default:
        return null;
    }
  };

  const FollowIcon = isFollowingProfile ? UserCheck : UserPlus;

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
		            <section className="profile-layout">
		              <aside className="profile-card">
			                <div className="profile-banner" aria-label="Profile banner">
	                      {bannerUrl ? (
	                        bannerIsVideo ? (
	                          <video
	                            src={bannerUrl}
	                            className="profile-banner-video"
	                            muted
	                            loop
	                            playsInline
	                            autoPlay
	                            preload="metadata"
	                            aria-hidden="true"
	                          />
	                        ) : (
	                          <Image
	                            src={bannerUrl}
	                            alt=""
	                            fill
	                            sizes="320px"
	                            className="profile-banner-image"
	                            unoptimized={bannerIsDataUrl || bannerIsGif}
	                          />
	                        )
	                      ) : null}
	                    </div>

                <div className="profile-header profile-header-with-banner">
                  <div
                    className={cn(
                      'profile-avatar',
                      avatarIsDecorated && 'profile-avatar-decorated',
                      !avatarIsDecorated && avatarDecorationClassName
                    )}
                    aria-label="User avatar"
                  >
                    <span className="profile-avatar-initial overflow-hidden">
                      {(isAuthenticated && authUser?.avatarUrl) ? (
                        <Image
                          src={authUser.avatarUrl}
                          alt=""
                          fill
                          sizes="84px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : profile.avatarDataUrl ? (
                        <Image
                          src={profile.avatarDataUrl}
                          alt=""
                          fill
                          sizes="84px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        avatarInitial
                      )}
                    </span>
	                    {avatarDecorationUrl ? (
	                      <Image
	                        src={avatarDecorationUrl}
	                        alt=""
	                        fill
	                        sizes="84px"
	                        className="profile-avatar-decoration"
	                        unoptimized={avatarDecorationUnoptimized}
	                      />
	                    ) : null}
	                  </div>

	                  <div className="profile-identity">
                    <h1 className="profile-name">{displayName}</h1>
                    <p className="profile-handle">@{displayName}</p>
                  </div>
                </div>

                <div className="profile-stats">
                  <div className="profile-stat">
                    <div className="profile-stat-value">{formatCompactNumber(followingCount)}</div>
                    <div className="profile-stat-label">Following</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">{formatCompactNumber(followersCount)}</div>
                    <div className="profile-stat-label">Followers</div>
                  </div>
	                  <div className="profile-stat">
	                  <div className="profile-stat-value">{formatCompactNumber(favoritesCount)}</div>
	                    <div className="profile-stat-label">Favorited</div>
	                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    type="button"
                    className={cn('profile-action', 'profile-action-primary', isFollowingProfile && 'profile-action-primary-active')}
                    onClick={toggleFollowProfile}
                    aria-pressed={isFollowingProfile}
                  >
                    <FollowIcon className="profile-action-icon" aria-hidden="true" />
                    {isFollowingProfile ? 'Following' : 'Follow'}
                  </button>

                  <Link href="/chat" className="profile-action profile-action-secondary">
                    <MessageCircle className="profile-action-icon" aria-hidden="true" />
                    Message
                  </Link>
                </div>

                <div className="profile-divider" />

                <div className="profile-bio">
                  <div className="profile-bio-title">Profile</div>
                  <p className={cn('profile-bio-text', !isBioExpanded && 'profile-bio-text-collapsed')}>
                    {bioText}
                  </p>
                  <button
                    type="button"
                    className="profile-bio-toggle"
                    onClick={() => setIsBioExpanded((prev) => !prev)}
                  >
                    {isBioExpanded ? 'Show Less' : 'Show More'}
                  </button>
                </div>
              </aside>

              <div className="profile-main">
                <div className="profile-tabs" role="tablist" aria-label="Profile tabs">
                  {tabItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === item.id}
                      className={cn('profile-tab', activeTab === item.id && 'profile-tab-active')}
                      onClick={() => setTab(item.id)}
                    >
                      <item.icon className="profile-tab-icon" aria-hidden="true" />
                      <span className="profile-tab-label">{item.label}</span>
                      <span className="profile-tab-count">{formatCompactNumber(item.count)}</span>
                    </button>
                  ))}
                </div>

                <div className="profile-content">
                  {renderTabContent()}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="gallery-loading">Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
