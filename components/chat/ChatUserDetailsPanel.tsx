'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, User, Images, BellOff, Bell, Ban, Flag, ChevronRight } from 'lucide-react';
import FollowButton from '@/components/models/detail/FollowButton';
import { formatCompactNumber } from '@/lib/format';
import { isVideoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

// Demo shared media images
const DEMO_SHARED_MEDIA = [
  'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&h=200&fit=crop',
];

type UserProfileSummary = {
  id: string;
  handle: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  avatarDecoration: string | null;
  avatarDecorationUrl: string | null;
  followersCount: number;
  followingCount: number;
  followStatus: 'none' | 'pending' | 'following';
};

export default function ChatUserDetailsPanel({
  userId,
  contactName,
  contactAvatarUrl,
}: {
  userId: string;
  contactName?: string;
  contactAvatarUrl?: string;
}) {
  const { headers } = useUser();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch profile — same approach as the profile page
  const fetchProfile = useCallback(async () => {
    if (!headers['x-vp-user-id']) return; // Wait for auth
    try {
      const response = await fetch(`/api/user/${userId}`, { headers });
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        setError(typeof data?.message === 'string' ? data.message : "You're blocked");
        setProfile(null);
        return;
      }
      if (!response.ok) {
        setError('Failed to load user');
        setProfile(null);
        return;
      }
      const data = (await response.json()) as UserProfileSummary;
      setProfile(data);
      setError(null);
    } catch {
      setError('Failed to load user');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, headers]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setError(null);
    fetchProfile();
  }, [fetchProfile]);

  // Refetch after follow/unfollow
  const handleFollowChange = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const displayName = profile?.handle?.trim() || contactName || userId.slice(0, 8);
  const avatarInitial = displayName.slice(0, 1).toUpperCase();
  const avatarUrl = profile?.avatarUrl || contactAvatarUrl || null;
  const bannerUrl = profile?.bannerUrl ?? null;
  const avatarDecorationUrl = profile?.avatarDecorationUrl ?? null;
  const profileHref = `/user/${profile?.handle ?? userId}`;

  return (
    <aside className="chat-panel chat-panel-right flex flex-col relative" aria-label="User details">
      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/90 border border-white/10 text-sm text-white font-medium shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {error ? (
          <div className="rounded-2xl border border-white/10 bg-background-secondary p-6 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">{error}</p>
            <p className="mt-2 text-xs text-text-secondary">You can&apos;t view this profile right now.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-background-secondary">
            <div className="relative h-24 w-full bg-background-tertiary overflow-hidden rounded-t-2xl">
              {bannerUrl ? (
                isVideoUrl(bannerUrl) ? (
                  <video
                    src={bannerUrl}
                    className="absolute inset-0 h-full w-full object-cover"
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
                    sizes="360px"
                    className="object-cover"
                    unoptimized={bannerUrl.startsWith('data:')}
                  />
                )
              ) : null}
            </div>

            <div className="px-4 pb-4">
              <div className="-mt-10 flex items-end gap-3">
                <div className="relative h-20 w-20 flex-shrink-0 rounded-full border border-white/10 bg-background-tertiary">
                  <div className="relative h-full w-full overflow-hidden rounded-full">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized={avatarUrl.startsWith('data:')}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                        {avatarInitial}
                      </div>
                    )}
                  </div>
                  {avatarDecorationUrl && (
                    <Image
                      src={avatarDecorationUrl}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-contain pointer-events-none z-[2]"
                      style={{ transform: 'scale(1.4)' }}
                      unoptimized
                    />
                  )}
                </div>
                <div className="min-w-0 pb-0 pl-3 pt-12">
                  <div className="text-base font-semibold text-white truncate">{displayName}</div>
                  {profile?.handle && (
                    <div className="text-xs text-text-secondary truncate">@{profile.handle}</div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-center">
                  <div className="text-sm font-extrabold text-white">
                    {formatCompactNumber(profile?.followersCount ?? 0)}
                  </div>
                  <div className="text-[11px] text-text-secondary">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-extrabold text-white">
                    {formatCompactNumber(profile?.followingCount ?? 0)}
                  </div>
                  <div className="text-[11px] text-text-secondary">Following</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <FollowButton
                  userId={userId}
                  initialState={profile?.followStatus}
                  className="flex-1"
                  onFollowChange={handleFollowChange}
                />
                <Link
                  href={profileHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
              </div>

              {loading ? (
                <p className="mt-4 text-xs text-text-secondary">Loading profile…</p>
              ) : profile?.bio ? (
                <p className="mt-4 text-sm text-text-secondary whitespace-pre-line">{profile.bio}</p>
              ) : null}
            </div>
          </div>
        )}

        {/* Shared Media Section */}
        {!error && (
          <div className="rounded-2xl border border-white/10 bg-background-secondary overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Images className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Shared Media</span>
              </div>
              <button
                type="button"
                onClick={() => showToast('Media gallery coming soon')}
                className="flex items-center gap-1 text-xs text-accent-pink hover:text-accent-pink/80 transition-colors"
              >
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {DEMO_SHARED_MEDIA.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    className="relative aspect-square rounded-lg overflow-hidden bg-background-tertiary hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
                  >
                    <Image
                      src={url}
                      alt={`Shared media ${index + 1}`}
                      fill
                      sizes="100px"
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Section */}
        {!error && (
          <div className="rounded-2xl border border-white/10 bg-background-secondary overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white">Chat Settings</span>
            </div>
            <div className="p-2">
              {/* Mute Notifications */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  'hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent-pink/40'
                )}
              >
                {isMuted ? (
                  <BellOff className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                ) : (
                  <Bell className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                )}
                <span className="flex-1 text-left text-sm text-white">
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </span>
                <div
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative',
                    isMuted ? 'bg-accent-pink' : 'bg-white/20'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      isMuted ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>

              {/* Block User */}
              <button
                type="button"
                onClick={() => showToast('Block feature coming soon')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  'hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent-pink/40'
                )}
              >
                <Ban className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <span className="flex-1 text-left text-sm text-white">Block User</span>
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              </button>

              {/* Report User */}
              <button
                type="button"
                onClick={() => showToast('Report feature coming soon')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                  'hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/40 group'
                )}
              >
                <Flag className="h-4 w-4 text-text-secondary group-hover:text-red-400" aria-hidden="true" />
                <span className="flex-1 text-left text-sm text-white group-hover:text-red-400">Report User</span>
                <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-red-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
