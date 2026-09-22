'use client';

import NextImage from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  Image as ImageIcon,
  Link2,
  Lock,
  Mail,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  UserPlus,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDataUrl, isGifUrl, isVideoUrl } from '@/lib/media';
import { useLocalUser } from '@/components/community/useLocalUser';
import { useLocalProfileSettings } from '@/components/profile/useLocalProfile';
import { useLocalAppSettings, type LocalAppSettings } from '@/components/settings/useLocalAppSettings';

type SettingsSectionId =
  | 'account'
  | 'profile'
  | 'privacy'
  | 'follow-requests'
  | 'notifications'
  | 'connections'
  | 'danger';

type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  Icon: typeof User;
};

const SETTINGS_NAV: SettingsNavItem[] = [
  { id: 'account', label: 'Account', Icon: User },
  { id: 'profile', label: 'Profile', Icon: ImageIcon },
  { id: 'privacy', label: 'Privacy', Icon: Shield },
  { id: 'follow-requests', label: 'Follow Requests', Icon: UserPlus },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'connections', label: 'Connected', Icon: Link2 },
  { id: 'danger', label: 'Danger', Icon: AlertTriangle },
];

type ConnectionField = keyof LocalAppSettings['connections'];

function useSyncedDraft(value: string) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft] as const;
}

function SettingSection({
  id,
  title,
  subtitle,
  Icon,
  children,
}: {
  id: SettingsSectionId;
  title: string;
  subtitle?: string;
  Icon: typeof User;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-white/10 bg-background-secondary p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-accent-pink" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {description ? <div className="mt-1 text-xs text-text-secondary">{description}</div> : null}
      </div>
      <div className="w-full sm:max-w-[420px]">{children}</div>
    </div>
  );
}

function TextInput(props: ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-background-tertiary px-3 py-2 text-sm text-white placeholder:text-text-muted',
        'focus:outline-none focus:ring-2 focus:ring-accent-pink/40',
        props.className
      )}
    />
  );
}

function TextArea(props: ComponentPropsWithoutRef<'textarea'>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-[96px] w-full resize-y rounded-xl border border-white/10 bg-background-tertiary px-3 py-2 text-sm text-white placeholder:text-text-muted',
        'focus:outline-none focus:ring-2 focus:ring-accent-pink/40',
        props.className
      )}
    />
  );
}

function Select(props: ComponentPropsWithoutRef<'select'>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-background-tertiary px-3 py-2 text-sm text-white',
        'focus:outline-none focus:ring-2 focus:ring-accent-pink/40',
        props.className
      )}
    />
  );
}

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn('toggle-switch', checked && 'toggle-switch-active', disabled && 'opacity-60')}
      onClick={() => onCheckedChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span className="toggle-switch-knob" />
    </button>
  );
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const MAX_AVATAR_GIF_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_GIF_BYTES = 8 * 1024 * 1024;

async function loadImage(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) => void; cleanup: () => void; }> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, sx, sy, sw, sh, dw, dh) => {
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
      },
      cleanup: () => bitmap.close(),
    };
  } catch {
    const dataUrl = await fileToDataUrl(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Failed to decode image'));
      element.src = dataUrl;
    });

    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, sx, sy, sw, sh, dw, dh) => {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      },
      cleanup: () => {},
    };
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to encode image'));
      else resolve(blob);
    }, type, quality);
  });
}

let cachedWebpSupport: boolean | null = null;

function supportsWebp(): boolean {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    cachedWebpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

async function resizeImageFile(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    crop: 'none' | 'square';
    quality: number;
  }
): Promise<string> {
  const source = await loadImage(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  const sourceSide = Math.min(sourceWidth, sourceHeight);
  const sx = options.crop === 'square' ? Math.floor((sourceWidth - sourceSide) / 2) : 0;
  const sy = options.crop === 'square' ? Math.floor((sourceHeight - sourceSide) / 2) : 0;
  const sw = options.crop === 'square' ? sourceSide : sourceWidth;
  const sh = options.crop === 'square' ? sourceSide : sourceHeight;

  const scale = options.crop === 'square'
    ? 1
    : Math.min(1, options.maxWidth / sw, options.maxHeight / sh);

  const targetWidth = Math.max(1, Math.round((options.crop === 'square' ? options.maxWidth : sw) * scale));
  const targetHeight = Math.max(1, Math.round((options.crop === 'square' ? options.maxHeight : sh) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    source.cleanup();
    throw new Error('Canvas not supported');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  source.draw(ctx, sx, sy, sw, sh, targetWidth, targetHeight);
  source.cleanup();

  const type = supportsWebp() ? 'image/webp' : 'image/jpeg';

  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, type, options.quality);
  } catch {
    blob = await canvasToBlob(canvas, 'image/jpeg', options.quality);
  }

  return fileToDataUrl(blob);
}

function Button({
  variant = 'secondary',
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  variant?: 'secondary' | 'danger';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent-pink/40 disabled:cursor-not-allowed disabled:opacity-60';
  const variantClass =
    variant === 'danger'
      ? 'border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10';

  return <button {...props} className={cn(base, variantClass, className)} />;
}

export default function SettingsPageContent() {
  const { handle, setHandle } = useLocalUser();
  const { profile, updateProfile, resetProfile, avatarDecorationClassName } = useLocalProfileSettings();
  const { settings, updateSettings, resetSettings } = useLocalAppSettings();

  const [displayNameDraft, setDisplayNameDraft] = useSyncedDraft(handle);
  const [emailDraft, setEmailDraft] = useSyncedDraft(settings.account.email);
  const [phoneDraft, setPhoneDraft] = useSyncedDraft(settings.account.phone);
  const [bioDraft, setBioDraft] = useSyncedDraft(profile.bio);
  const [bannerUrlDraft, setBannerUrlDraft] = useSyncedDraft(profile.bannerUrl ?? '');
  const [websiteDraft, setWebsiteDraft] = useSyncedDraft(settings.connections.website);
  const [discordDraft, setDiscordDraft] = useSyncedDraft(settings.connections.discord);
  const [xDraft, setXDraft] = useSyncedDraft(settings.connections.x);
  const [redditDraft, setRedditDraft] = useSyncedDraft(settings.connections.reddit);
  const [instagramDraft, setInstagramDraft] = useSyncedDraft(settings.connections.instagram);
  const [blockedDraft, setBlockedDraft] = useState('');

  // Follow requests state
  const [followRequests, setFollowRequests] = useState<Array<{
    id: string;
    userId: string;
    handle: string | null;
    avatarUrl: string | null;
    bio: string | null;
    requestedAt: string;
  }>>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [avatarError, setAvatarError] = useState<string>('');
  const [bannerError, setBannerError] = useState<string>('');
  const [isAvatarBusy, setIsAvatarBusy] = useState(false);
  const [isBannerBusy, setIsBannerBusy] = useState(false);

  const avatarInitial = useMemo(() => (handle || 'U').slice(0, 1).toUpperCase(), [handle]);
  const bannerPreviewUrl = profile.bannerUrl ?? profile.bannerDataUrl;

  const commitDisplayName = useCallback(() => {
    const next = displayNameDraft.trim();
    if (!next) {
      setDisplayNameDraft(handle);
      return;
    }
    setHandle(next);
  }, [displayNameDraft, handle, setHandle, setDisplayNameDraft]);

  const commitAccountField = useCallback((field: 'email' | 'phone', value: string) => {
    updateSettings((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        [field]: value.trim(),
      },
    }));
  }, [updateSettings]);

  const commitConnectionsField = useCallback((field: ConnectionField, value: string) => {
    updateSettings((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [field]: value.trim(),
      },
    }));
  }, [updateSettings]);

  const commitBio = useCallback(() => {
    updateProfile({ bio: bioDraft.trim() });
  }, [bioDraft, updateProfile]);

  const commitBannerUrl = useCallback(() => {
    setBannerError('');
    const next = bannerUrlDraft.trim();

    if (!next) {
      updateProfile({ bannerUrl: undefined });
      return;
    }

    if (!next.startsWith('/')) {
      try {
        const url = new URL(next);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          setBannerError('Please use an http(s) URL for your banner.');
          return;
        }
      } catch {
        setBannerError('Please enter a valid banner URL.');
        return;
      }
    }

    updateProfile({ bannerUrl: next, bannerDataUrl: undefined });
  }, [bannerUrlDraft, updateProfile]);

  const addBlockedHandle = useCallback(() => {
    const next = blockedDraft.trim();
    if (!next) return;
    updateSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        blockedHandles: Array.from(new Set([...prev.privacy.blockedHandles, next])),
      },
    }));
    setBlockedDraft('');
  }, [blockedDraft, updateSettings]);

  const removeBlockedHandle = useCallback((handleToRemove: string) => {
    updateSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        blockedHandles: prev.privacy.blockedHandles.filter((item) => item !== handleToRemove),
      },
    }));
  }, [updateSettings]);

  // Fetch follow requests on mount
  useEffect(() => {
    async function fetchFollowRequests() {
      setIsLoadingRequests(true);
      try {
        const response = await fetch('/api/user/follow/requests');
        if (response.ok) {
          const data = await response.json();
          setFollowRequests(data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching follow requests:', error);
      } finally {
        setIsLoadingRequests(false);
      }
    }
    fetchFollowRequests();
  }, []);

  const handleFollowResponse = useCallback(async (requesterId: string, action: 'accept' | 'reject') => {
    setRespondingTo(requesterId);
    try {
      const response = await fetch('/api/user/follow/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, action }),
      });

      if (response.ok) {
        setFollowRequests((prev) => prev.filter((req) => req.userId !== requesterId));
      }
    } catch (error) {
      console.error('Error responding to follow request:', error);
    } finally {
      setRespondingTo(null);
    }
  }, []);

  const updateAvatar = useCallback(async (file: File) => {
    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }

    setIsAvatarBusy(true);
    try {
      const dataUrl =
        file.type === 'image/gif'
          ? await (async () => {
              if (file.size > MAX_AVATAR_GIF_BYTES) {
                throw new Error('Avatar GIF is too large. Please choose a smaller file.');
              }
              return fileToDataUrl(file);
            })()
          : await resizeImageFile(file, {
              maxWidth: 256,
              maxHeight: 256,
              crop: 'square',
              quality: 0.86,
            });
      updateProfile({ avatarDataUrl: dataUrl });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Failed to update avatar.');
    } finally {
      setIsAvatarBusy(false);
    }
  }, [updateProfile]);

  const updateBanner = useCallback(async (file: File) => {
    setBannerError('');
    if (!file.type.startsWith('image/')) {
      setBannerError('Please choose an image file.');
      return;
    }

    setIsBannerBusy(true);
    try {
      const dataUrl =
        file.type === 'image/gif'
          ? await (async () => {
              if (file.size > MAX_BANNER_GIF_BYTES) {
                throw new Error('Banner GIF is too large. Please choose a smaller file.');
              }
              return fileToDataUrl(file);
            })()
          : await resizeImageFile(file, {
              maxWidth: 1600,
              maxHeight: 500,
              crop: 'none',
              quality: 0.84,
            });
      updateProfile({ bannerDataUrl: dataUrl, bannerUrl: undefined });
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : 'Failed to update banner.');
    } finally {
      setIsBannerBusy(false);
    }
  }, [updateProfile]);

  const clearVirtualPartnerStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.startsWith('vp:') || key.startsWith('vp_')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem('promo_banner_dismissed');
  }, []);

  const handleDeactivate = useCallback(() => {
    const next = !settings.accountState.deactivated;
    const actionLabel = next ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${actionLabel} your account for this browser?`)) return;

    updateSettings((prev) => ({
      ...prev,
      accountState: {
        ...prev.accountState,
        deactivated: next,
      },
      privacy: next
        ? { ...prev.privacy, visibility: 'private' }
        : prev.privacy,
    }));
  }, [settings.accountState.deactivated, updateSettings]);

  const handleDelete = useCallback(() => {
    if (!window.confirm('Delete your account data from this browser? This cannot be undone.')) return;
    clearVirtualPartnerStorage();
    resetProfile();
    resetSettings();
    window.dispatchEvent(new Event('vp:user:updated'));
    window.location.assign('/');
  }, [clearVirtualPartnerStorage, resetProfile, resetSettings]);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
      <aside className="h-fit rounded-2xl border border-white/10 bg-background-secondary p-4 shadow-card lg:sticky lg:top-6">
        <div className="text-sm font-semibold text-white">Settings</div>
        <nav className="mt-3 flex flex-col gap-1">
          {SETTINGS_NAV.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        {settings.accountState.deactivated ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            Your account is currently deactivated (local-only). Some actions may be restricted soon.
          </div>
        ) : null}

        <SettingSection
          id="account"
          title="Account Settings"
          subtitle="Basics used for identity, notifications, and recovery."
          Icon={User}
        >
          <SettingRow label="Display name" description="Public username shown on your profile.">
            <div className="relative">
              <TextInput
                value={displayNameDraft}
                onChange={(e) => setDisplayNameDraft(e.target.value)}
                onBlur={commitDisplayName}
                placeholder="Your display name"
                autoComplete="nickname"
              />
            </div>
          </SettingRow>

          <SettingRow label="Email address" description="Used for notifications and account recovery (when enabled).">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <TextInput
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onBlur={() => commitAccountField('email', emailDraft)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                type="email"
                className="pl-10"
              />
            </div>
          </SettingRow>

          <SettingRow label="Phone number" description="Used for 2FA and recovery (when enabled).">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <TextInput
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                onBlur={() => commitAccountField('phone', phoneDraft)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                inputMode="tel"
                className="pl-10"
              />
            </div>
          </SettingRow>

          <SettingRow label="Password" description="Change your password (requires account system).">
            <div className="flex items-center gap-2">
              <Button disabled type="button">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Change password
              </Button>
              <span className="text-xs text-text-secondary">Coming soon</span>
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection
          id="profile"
          title="Profile Customization"
          subtitle="Make your profile look and feel like you."
          Icon={ImageIcon}
        >
          <SettingRow label="Avatar / profile picture" description="Upload an image or GIF (auto-cropped & compressed when possible).">
            <div className="flex items-center gap-3">
              <div className={cn('h-12 w-12 overflow-hidden rounded-2xl bg-background-tertiary', avatarDecorationClassName)}>
                {profile.avatarDataUrl ? (
                  <NextImage
                    src={profile.avatarDataUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {avatarInitial}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void updateAvatar(file);
                    e.currentTarget.value = '';
                  }}
                />

                <Button type="button" onClick={() => avatarInputRef.current?.click()} disabled={isAvatarBusy}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {isAvatarBusy ? 'Uploading...' : 'Upload'}
                </Button>

                <Button
                  type="button"
                  onClick={() => updateProfile({ avatarDataUrl: undefined })}
                  disabled={!profile.avatarDataUrl || isAvatarBusy}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </div>
            {avatarError ? <p className="mt-2 text-xs text-red-200">{avatarError}</p> : null}
          </SettingRow>

          <SettingRow label="Profile banner" description="Upload an image/GIF or paste a URL (image/GIF/MP4).">
            <div className="space-y-2">
              <div className="relative h-20 w-full overflow-hidden rounded-2xl border border-white/10 bg-background-tertiary">
                {bannerPreviewUrl ? (
                  isVideoUrl(bannerPreviewUrl) ? (
                    <video
                      src={bannerPreviewUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                      aria-hidden="true"
                    />
                  ) : (
                    <NextImage
                      src={bannerPreviewUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 90vw, 420px"
                      className="object-cover"
                      unoptimized={isDataUrl(bannerPreviewUrl) || isGifUrl(bannerPreviewUrl)}
                    />
                  )
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void updateBanner(file);
                    e.currentTarget.value = '';
                  }}
                />

                <Button type="button" onClick={() => bannerInputRef.current?.click()} disabled={isBannerBusy}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {isBannerBusy ? 'Uploading...' : 'Upload'}
                </Button>
                <Button
                  type="button"
                  onClick={() => updateProfile({ bannerDataUrl: undefined, bannerUrl: undefined })}
                  disabled={(!profile.bannerDataUrl && !profile.bannerUrl) || isBannerBusy}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </Button>
              </div>

              <TextInput
                value={bannerUrlDraft}
                onChange={(e) => setBannerUrlDraft(e.target.value)}
                onBlur={commitBannerUrl}
                placeholder="https://... (image/GIF/MP4) or /videos/banner.mp4"
              />

              {bannerError ? <p className="text-xs text-red-200">{bannerError}</p> : null}
            </div>
          </SettingRow>

          <SettingRow label="Avatar decorations" description="Frames / effects (local-only for now).">
            <Select
              value={profile.avatarDecoration}
              onChange={(e) => updateProfile({ avatarDecoration: e.target.value as typeof profile.avatarDecoration })}
            >
              <option value="none">None</option>
              <option value="pink-glow">Pink glow</option>
              <option value="purple-glow">Purple glow</option>
              <option value="gold-frame">Gold frame</option>
            </Select>
          </SettingRow>

          <SettingRow label="Bio / About me" description="Short description shown on your profile.">
            <div>
              <TextArea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                onBlur={commitBio}
                placeholder="Tell people about yourself..."
                maxLength={280}
              />
              <div className="mt-1 text-right text-xs text-text-muted">{bioDraft.length}/280</div>
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection
          id="privacy"
          title="Privacy Settings"
          subtitle="Control who can see you and who you interact with."
          Icon={Shield}
        >
          <SettingRow label="Profile visibility" description="Choose who can view your profile.">
            <Select
              value={settings.privacy.visibility}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, visibility: e.target.value as typeof prev.privacy.visibility },
                }))
              }
            >
              <option value="public">Public</option>
              <option value="friends-only">Friends only</option>
              <option value="private">Private</option>
            </Select>
          </SettingRow>

          <SettingRow
            label="Public favorites"
            description="If disabled, others won't see your Favorites tab on your profile."
          >
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
              <span className="text-sm text-white">Show favorites</span>
              <ToggleSwitch
                checked={settings.privacy.favoritesPublic}
                onCheckedChange={(next) =>
                  updateSettings((prev) => ({
                    ...prev,
                    privacy: { ...prev.privacy, favoritesPublic: next },
                  }))
                }
              />
            </div>
          </SettingRow>

          <SettingRow label="Block list" description="Users you block won't be able to interact with you.">
            <div className="space-y-3">
              <div className="flex gap-2">
                <TextInput
                  value={blockedDraft}
                  onChange={(e) => setBlockedDraft(e.target.value)}
                  placeholder="Add a username (e.g. @user)"
                />
                <Button type="button" onClick={addBlockedHandle} disabled={!blockedDraft.trim()}>
                  Add
                </Button>
              </div>

              {settings.privacy.blockedHandles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {settings.privacy.blockedHandles.map((blocked) => (
                    <span
                      key={blocked}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white"
                    >
                      {blocked}
                      <button
                        type="button"
                        className="text-text-secondary hover:text-white"
                        onClick={() => removeBlockedHandle(blocked)}
                        aria-label={`Remove ${blocked}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-secondary">No blocked users.</div>
              )}
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection
          id="follow-requests"
          title="Follow Requests"
          subtitle="People who want to follow you."
          Icon={UserPlus}
        >
          {isLoadingRequests ? (
            <div className="text-sm text-text-secondary">Loading...</div>
          ) : followRequests.length === 0 ? (
            <div className="text-sm text-text-secondary">No pending follow requests.</div>
          ) : (
            <div className="space-y-3">
              {followRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-background-tertiary p-3"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-background-secondary flex-shrink-0">
                    {request.avatarUrl ? (
                      <NextImage
                        src={request.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                        {(request.handle || 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">
                      {request.handle || 'User'}
                    </div>
                    {request.bio && (
                      <div className="text-xs text-text-secondary truncate">{request.bio}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      onClick={() => handleFollowResponse(request.userId, 'accept')}
                      disabled={respondingTo === request.userId}
                    >
                      {respondingTo === request.userId ? '...' : 'Accept'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => handleFollowResponse(request.userId, 'reject')}
                      disabled={respondingTo === request.userId}
                    >
                      {respondingTo === request.userId ? '...' : 'Decline'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingSection>

        <SettingSection
          id="notifications"
          title="Notification Settings"
          subtitle="Choose what you want to be notified about."
          Icon={Bell}
        >
          <SettingRow label="Email notifications" description="Messages, follows, and product updates.">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">Messages</span>
                <ToggleSwitch
                  checked={settings.notifications.email.messages}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: { ...prev.notifications.email, messages: next } },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">New follows</span>
                <ToggleSwitch
                  checked={settings.notifications.email.follows}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: { ...prev.notifications.email, follows: next } },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">Product updates</span>
                <ToggleSwitch
                  checked={settings.notifications.email.product}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: { ...prev.notifications.email, product: next } },
                    }))
                  }
                />
              </div>
            </div>
          </SettingRow>

          <SettingRow label="Push notifications" description="Mobile/desktop alerts (when enabled).">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">Messages</span>
                <ToggleSwitch
                  checked={settings.notifications.push.messages}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: { ...prev.notifications.push, messages: next } },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">New follows</span>
                <ToggleSwitch
                  checked={settings.notifications.push.follows}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: { ...prev.notifications.push, follows: next } },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background-tertiary px-3 py-2">
                <span className="text-sm text-white">Product updates</span>
                <ToggleSwitch
                  checked={settings.notifications.push.product}
                  onCheckedChange={(next) =>
                    updateSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: { ...prev.notifications.push, product: next } },
                    }))
                  }
                />
              </div>
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection
          id="connections"
          title="Connected Accounts"
          subtitle="Add your social handles/links (OAuth coming later)."
          Icon={Link2}
        >
          <SettingRow label="Website" description="Your personal website link.">
            <TextInput
              value={websiteDraft}
              onChange={(e) => setWebsiteDraft(e.target.value)}
              onBlur={() => commitConnectionsField('website', websiteDraft)}
              placeholder="https://example.com"
              inputMode="url"
            />
          </SettingRow>

          <SettingRow label="Discord" description="Your Discord username or invite link.">
            <TextInput
              value={discordDraft}
              onChange={(e) => setDiscordDraft(e.target.value)}
              onBlur={() => commitConnectionsField('discord', discordDraft)}
              placeholder="username#0000"
            />
          </SettingRow>

          <SettingRow label="X" description="Your X handle or profile link.">
            <TextInput
              value={xDraft}
              onChange={(e) => setXDraft(e.target.value)}
              onBlur={() => commitConnectionsField('x', xDraft)}
              placeholder="@username"
            />
          </SettingRow>

          <SettingRow label="Reddit" description="Your Reddit username or profile link.">
            <TextInput
              value={redditDraft}
              onChange={(e) => setRedditDraft(e.target.value)}
              onBlur={() => commitConnectionsField('reddit', redditDraft)}
              placeholder="u/username"
            />
          </SettingRow>

          <SettingRow label="Instagram" description="Your Instagram handle or profile link.">
            <TextInput
              value={instagramDraft}
              onChange={(e) => setInstagramDraft(e.target.value)}
              onBlur={() => commitConnectionsField('instagram', instagramDraft)}
              placeholder="@username"
            />
          </SettingRow>
        </SettingSection>

        <SettingSection
          id="danger"
          title="Danger Zone"
          subtitle="Be careful — these actions are hard to undo."
          Icon={AlertTriangle}
        >
          <SettingRow
            label="Deactivate account"
            description="Temporarily disable your account (local-only). Sets profile visibility to private."
          >
            <Button type="button" onClick={handleDeactivate} variant="danger">
              <UserX className="h-4 w-4" aria-hidden="true" />
              {settings.accountState.deactivated ? 'Reactivate' : 'Deactivate'}
            </Button>
          </SettingRow>

          <SettingRow
            label="Delete account"
            description="Permanently remove your local account + settings from this browser."
          >
            <Button type="button" onClick={handleDelete} variant="danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </Button>
          </SettingRow>
        </SettingSection>
      </div>
    </div>
  );
}
