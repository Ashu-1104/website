'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Globe,
  Headphones,
  Heart,
  Image as ImageIcon,
  Instagram,
  Link2,
  Lock,
  MessageCircle,
  Sparkles,
  Twitter,
  Users,
  Video,
  Wrench,
  X,
} from 'lucide-react';

import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { isVideoUrl } from '@/lib/media';
import FollowButton from '@/components/models/detail/FollowButton';
import PublicProfileCharactersTab from '@/components/profile/public/PublicProfileCharactersTab';
import PublicProfileDecorationsTab from '@/components/profile/public/PublicProfileDecorationsTab';
import PublicProfileFavoritesTab from '@/components/profile/public/PublicProfileFavoritesTab';
import PublicProfileMediaTab from '@/components/profile/public/PublicProfileMediaTab';
import PublicProfileModelsTab from '@/components/profile/public/PublicProfileModelsTab';

type ProfileTab =
  | 'images'
  | 'videos'
  | 'partners'
  | 'models'
  | 'favorites'
  | 'ai-audio'
  | 'ai-tools'
  | 'decoration';

type FollowListType = 'followers' | 'following';

type PublicProfile = {
  id: string;
  handle: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  avatarDecoration: string;
  profileVisibility: 'public' | 'private' | 'friends-only';
  favoritesPublic: boolean;
  followersCount: number;
  followingCount: number;
  followStatus: 'none' | 'pending' | 'following';
  isSelf: boolean;
  canViewContent: boolean;
  canViewFavorites: boolean;
  privacyMessage: string | null;
  connections: {
    discord: string;
    x: string;
    reddit: string;
    instagram: string;
    website: string;
  };
  imagesCount?: number;
  videosCount?: number;
  modelsCount?: number;
  charactersCount?: number;
  decorationsCount?: number;
  favoritesCount?: number;
  favoritesByType?: {
    images: number;
    videos: number;
    models: number;
    partners: number;
    aiAudio: number;
  };
};

type FollowListUser = {
  id: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeHandleUrl(value: string, base: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^@/, '').replace(/^\/+/, '');
  if (!normalized) return null;
  return `${base}${normalized}`;
}

function normalizeRedditUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const normalized = trimmed.replace(/^\/+/, '');
  const withoutPrefix =
    normalized.startsWith('u/') || normalized.startsWith('user/')
      ? normalized.replace(/^(u\/|user\/)/, '')
      : normalized;

  if (!withoutPrefix) return null;
  return `https://www.reddit.com/user/${withoutPrefix}`;
}

function normalizeProfileHref(handle: string | null, userId: string) {
  const slug = handle?.trim();
  return `/user/${slug && slug.length > 0 ? slug : userId}`;
}

function ProfileEmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="gallery-empty-state">
      <h3 className="gallery-empty-title">{title}</h3>
      <p className="gallery-empty-subtitle">{subtitle}</p>
    </div>
  );
}

export default function PublicProfileContent({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { headers, userId: currentUserId } = useUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [localFollowStatus, setLocalFollowStatus] = useState<'none' | 'pending' | 'following'>(
    profile?.followStatus ?? 'none'
  );
  const [followListType, setFollowListType] = useState<FollowListType | null>(null);
  const [followListUsers, setFollowListUsers] = useState<FollowListUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const setTab = useCallback(
    (tab: ProfileTab) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', tab);
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (currentUserId && currentUserId === userId) {
      router.replace('/profile');
    }
  }, [currentUserId, router, userId]);

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      setError(null);
      setBlockedMessage(null);

      try {
        const response = await fetch(`/api/user/${userId}`, { headers });
        if (response.status === 403) {
          const data = await response.json().catch(() => ({}));
          setBlockedMessage(typeof data?.message === 'string' ? data.message : "You're blocked");
          return;
        }
        if (!response.ok) {
          setError('Failed to load profile');
          return;
        }
        const data = (await response.json()) as PublicProfile;
        setProfile(data);
      } catch {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, [headers, userId]);

  // Sync local follow status when profile loads
  useEffect(() => {
    if (profile?.followStatus) {
      setLocalFollowStatus(profile.followStatus);
    }
  }, [profile?.followStatus]);

  // Refetch profile after follow/unfollow to update counts
  const handleFollowChange = useCallback(
    (newState: 'none' | 'pending' | 'following') => {
      setLocalFollowStatus(newState);
      void fetch(`/api/user/${userId}`, { headers })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as PublicProfile;
          setProfile(data);
        })
        .catch(() => {});
    },
    [headers, userId]
  );

  const openFollowList = useCallback(
    async (type: FollowListType) => {
      setFollowListType(type);
      setFollowListLoading(true);
      setFollowListError(null);
      setFollowListUsers([]);

      try {
        const response = await fetch(`/api/user/follow?type=${type}&userId=${userId}`, { headers });
        if (!response.ok) {
          setFollowListError('Failed to load list');
          return;
        }
        const data = (await response.json()) as { users?: FollowListUser[] };
        setFollowListUsers(Array.isArray(data.users) ? data.users : []);
      } catch {
        setFollowListError('Failed to load list');
      } finally {
        setFollowListLoading(false);
      }
    },
    [headers, userId]
  );

  const closeFollowList = useCallback(() => {
    setFollowListType(null);
    setFollowListUsers([]);
    setFollowListError(null);
    setFollowListLoading(false);
  }, []);

  useEffect(() => {
    if (!followListType) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFollowList();
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!modalRef.current) return;
      if (modalRef.current.contains(target)) return;
      closeFollowList();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [closeFollowList, followListType]);

  const displayName = useMemo(() => {
    const handle = profile?.handle?.trim();
    return handle && handle.length > 0 ? handle : 'User';
  }, [profile?.handle]);

  const avatarInitial = useMemo(() => displayName.slice(0, 1).toUpperCase(), [displayName]);

  const decorationClassName = useMemo(() => {
    switch (profile?.avatarDecoration) {
      case 'PINK_GLOW':
        return 'shadow-glow';
      case 'PURPLE_GLOW':
        return 'shadow-[0_0_20px_rgba(155,89,182,0.35)]';
      case 'GOLD_FRAME':
        return 'ring-2 ring-yellow-400';
      default:
        return '';
    }
  }, [profile?.avatarDecoration]);

  const canShowFavoritesTab = Boolean(profile?.canViewContent && profile?.canViewFavorites && profile?.favoritesPublic);

  const tabItems = useMemo(() => {
    const items = [
      canShowFavoritesTab
        ? {
            id: 'favorites' as const,
            label: 'Favorites',
            icon: Heart,
            count: profile?.favoritesCount ?? 0,
          }
        : null,
      { id: 'images' as const, label: 'Image', icon: ImageIcon, count: profile?.imagesCount ?? 0 },
      { id: 'videos' as const, label: 'Video', icon: Video, count: profile?.videosCount ?? 0 },
      { id: 'partners' as const, label: 'AI Partners', icon: Users, count: profile?.charactersCount ?? 0 },
      { id: 'models' as const, label: 'Models', icon: Box, count: profile?.modelsCount ?? 0 },
      { id: 'ai-audio' as const, label: 'AI Audio', icon: Headphones, count: 0 },
      { id: 'ai-tools' as const, label: 'AI Tools', icon: Wrench, count: 0 },
      { id: 'decoration' as const, label: 'Decoration', icon: Sparkles, count: profile?.decorationsCount ?? 0 },
    ].filter(Boolean);

    return items as Array<{
      id: ProfileTab;
      label: string;
      icon: typeof Heart;
      count: number;
    }>;
  }, [
    canShowFavoritesTab,
    profile?.charactersCount,
    profile?.decorationsCount,
    profile?.favoritesCount,
    profile?.imagesCount,
    profile?.modelsCount,
    profile?.videosCount,
  ]);

  const effectiveActiveTab = useMemo<ProfileTab>(() => {
    if (activeTab === 'favorites' && !canShowFavoritesTab) return 'images';
    return activeTab;
  }, [activeTab, canShowFavoritesTab]);

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    if (!canShowFavoritesTab) setTab('images');
  }, [activeTab, canShowFavoritesTab, setTab]);

  const socialLinks = useMemo(() => {
    if (!profile) return [];
    const links: Array<{ key: string; href: string; label: string; Icon: typeof Globe }> = [];
    const website = normalizeWebsite(profile.connections.website);
    if (website) links.push({ key: 'website', href: website, label: 'Website', Icon: Globe });

    const x = normalizeHandleUrl(profile.connections.x, 'https://x.com/');
    if (x) links.push({ key: 'x', href: x, label: 'X', Icon: Twitter });

    const instagram = normalizeHandleUrl(profile.connections.instagram, 'https://www.instagram.com/');
    if (instagram) links.push({ key: 'instagram', href: instagram, label: 'Instagram', Icon: Instagram });

    const reddit = normalizeRedditUrl(profile.connections.reddit);
    if (reddit) links.push({ key: 'reddit', href: reddit, label: 'Reddit', Icon: Link2 });

    const discord = profile.connections.discord.trim();
    if (discord && isAbsoluteUrl(discord)) {
      links.push({ key: 'discord', href: discord, label: 'Discord', Icon: Link2 });
    }

    return links;
  }, [profile]);

  if (isLoading) {
    return <div className="gallery-loading">Loading profile...</div>;
  }

  if (blockedMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="w-16 h-16 text-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{blockedMessage}</h2>
        <p className="text-text-secondary">You can&apos;t view this profile right now.</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-16 h-16 text-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{error || 'Profile not found'}</h2>
        <Link href="/" className="text-accent-pink hover:underline">
          Return home
        </Link>
      </div>
    );
  }

  const renderTabContent = () => {
    if (!profile.canViewContent) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lock className="w-16 h-16 text-text-muted mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {profile.privacyMessage ?? 'This profile is private'}
          </h2>
          <p className="text-text-secondary mb-4">
            {profile.profileVisibility === 'private'
              ? 'Follow this account to see their content.'
              : 'This user only shares content with mutual followers.'}
          </p>
          {profile.followStatus === 'pending' && (
            <p className="text-yellow-400 text-sm">Your follow request is pending</p>
          )}
        </div>
      );
    }

    switch (effectiveActiveTab) {
      case 'images':
        return <PublicProfileMediaTab userId={profile.id} type="IMAGE" />;
      case 'videos':
        return <PublicProfileMediaTab userId={profile.id} type="VIDEO" />;
      case 'partners':
        return <PublicProfileCharactersTab userId={profile.id} />;
      case 'models':
        return <PublicProfileModelsTab userId={profile.id} />;
      case 'favorites':
        return (
          <PublicProfileFavoritesTab
            userId={profile.id}
            counts={profile.favoritesByType}
          />
        );
      case 'ai-audio':
        return (
          <ProfileEmptyState
            title="No AI audio yet"
            subtitle="Audio generations will show up here once supported."
          />
        );
      case 'ai-tools':
        return (
          <ProfileEmptyState
            title="No AI tools yet"
            subtitle="Tools and presets will show up here once supported."
          />
        );
      case 'decoration':
        return <PublicProfileDecorationsTab userId={profile.id} avatarInitial={avatarInitial} />;
      default:
        return null;
    }
  };

  return (
    <>
      <section className="profile-layout">
        <aside className="profile-card">
          <div className="profile-banner" aria-label="Profile banner">
            {profile.bannerUrl ? (
              isVideoUrl(profile.bannerUrl) ? (
                <video
                  src={profile.bannerUrl}
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
                  src={profile.bannerUrl}
                  alt=""
                  fill
                  sizes="320px"
                  className="profile-banner-image object-cover"
                  unoptimized={profile.bannerUrl.startsWith('data:')}
                />
              )
            ) : (
              <div className="absolute inset-0 bg-background-tertiary" />
            )}
          </div>

          <div className="profile-header profile-header-with-banner">
            <div className={cn('profile-avatar', decorationClassName)} aria-label="User avatar">
              <span className="profile-avatar-initial overflow-hidden">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt=""
                    fill
                    sizes="84px"
                    className="object-cover"
                    unoptimized={profile.avatarUrl.startsWith('data:')}
                  />
                ) : (
                  avatarInitial
                )}
              </span>
            </div>

            <div className="profile-identity">
              <h1 className="profile-name">{displayName}</h1>
              <p className="profile-handle">@{displayName}</p>
            </div>
          </div>

          <div className="profile-stats">
            <button
              type="button"
              className="profile-stat bg-transparent border-0 p-0"
              onClick={() => openFollowList('following')}
            >
              <div className="profile-stat-value">{formatCompactNumber(profile.followingCount)}</div>
              <div className="profile-stat-label">Following</div>
            </button>
            <button
              type="button"
              className="profile-stat bg-transparent border-0 p-0"
              onClick={() => openFollowList('followers')}
            >
              <div className="profile-stat-value">{formatCompactNumber(profile.followersCount)}</div>
              <div className="profile-stat-label">Followers</div>
            </button>
            {canShowFavoritesTab ? (
              <div className="profile-stat">
                <div className="profile-stat-value">{formatCompactNumber(profile.favoritesCount ?? 0)}</div>
                <div className="profile-stat-label">Favorited</div>
              </div>
            ) : (
              <div className="profile-stat" />
            )}
          </div>

          <div className="profile-actions">
            <FollowButton
              userId={profile.id}
              className={cn(
                'profile-action flex-1',
                localFollowStatus === 'none'
                  ? 'profile-action-primary'
                  : 'profile-action-primary-active'
              )}
              initialState={profile.followStatus}
              onFollowChange={handleFollowChange}
            />
            <Link
              href={`/chat/${profile.id}?type=user`}
              className="profile-action profile-action-secondary"
            >
              <MessageCircle className="profile-action-icon w-4 h-4" aria-hidden="true" />
              Message
            </Link>
          </div>

          {(profile.bio?.trim() || socialLinks.length > 0) && <div className="profile-divider" />}

          {profile.bio?.trim() ? (
            <div className="profile-bio">
              <div className="profile-bio-title">Profile</div>
              <p className="profile-bio-text">{profile.bio}</p>
            </div>
          ) : null}

          {socialLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full',
                    'border border-white/10 bg-white/5 text-white/80',
                    'hover:bg-white/10 hover:text-white transition-colors'
                  )}
                  aria-label={link.label}
                  title={link.label}
                >
                  <link.Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="profile-main">
          <div className="profile-tabs" role="tablist" aria-label="Profile tabs">
            {tabItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={effectiveActiveTab === item.id}
                className={cn('profile-tab', effectiveActiveTab === item.id && 'profile-tab-active')}
                onClick={() => setTab(item.id)}
              >
                <item.icon className="profile-tab-icon" aria-hidden="true" />
                <span className="profile-tab-label">{item.label}</span>
                <span className="profile-tab-count">{formatCompactNumber(item.count)}</span>
              </button>
            ))}
          </div>

          <div className="profile-content">{renderTabContent()}</div>
        </div>
      </section>

      {followListType && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Follow list">
          <div ref={modalRef} className="modal-content max-w-[560px]">
            <div className="modal-header">
              <h3>{followListType === 'followers' ? 'Followers' : 'Following'}</h3>
              <button type="button" className="modal-close" onClick={closeFollowList} aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {followListLoading ? (
                <div className="text-sm text-text-secondary">Loading...</div>
              ) : followListError ? (
                <div className="text-sm text-red-200">{followListError}</div>
              ) : followListUsers.length === 0 ? (
                <div className="text-sm text-text-secondary">No users yet.</div>
              ) : (
                <div className="space-y-3">
                  {followListUsers.map((user) => (
                    <Link
                      key={user.id}
                      href={normalizeProfileHref(user.handle, user.id)}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-background-tertiary p-3 hover:bg-white/5 transition-colors"
                      onClick={closeFollowList}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-background-secondary flex-shrink-0 relative">
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized={user.avatarUrl.startsWith('data:')}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                            {(user.handle || 'U').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate">{user.handle || 'User'}</div>
                        {user.bio ? <div className="text-xs text-text-secondary truncate">{user.bio}</div> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
