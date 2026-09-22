'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import Image from 'next/image';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Check, ChevronDown, ChevronRight, Filter, Plus, Search, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVideoUrl } from '@/lib/media';
import { apiFetch } from '@/hooks/useApi';
import { useNsfwPreference } from '@/hooks/useNsfwPreference';

// ─── Zero-Waterfall Cascade thresholds ────────────────────────────────────
// Cards 0..EAGER_THRESHOLD : loading="eager" fetchpriority="high"
// Cards EAGER_..LAZY_       : loading="eager" (still eager, lower priority)
// Cards >= LAZY_THRESHOLD   : loading="lazy" (defer until scrolled into view)
const EAGER_HIGH_PRIORITY_COUNT = 10;
const EAGER_THRESHOLD = 30;


interface LivecamGirl {
  id: string;
  name: string;
  age: number;
  image: string;
  images: string[]; // all non-video avatar URLs for hover slideshow
  videoUrl: string | null; // first .mp4 from avatarUrls for hover preview
  isOnline: boolean;
  badge?: string;
  style: 'realistic' | 'anime';
  gender: 'female' | 'male' | 'trans';
  likeCount: number;
  usageCount: number;
  createdAt: number; // epoch ms
  tags: string[];
  isNsfw?: boolean;
}

type TagOption = {
  value: string;
  label: string;
};

const TAG_OPTIONS: ReadonlyArray<TagOption> = (() => {
  const rawLabels = [
    'Latina',
    'Blonde',
    'Busty',
    'Submissive',
    'Dominant',
    'BDSM',
    'Romantic',
    'Athletic',
    'Caring',
    'Virgin',
    'College Student',
    'Cheating',
    'Villian',
    'BDSMCute',
    'Goth',
    'Kinky',
    'Arrogant',
    'Foot Fetish',
    'Step Mom',
    'Step Sister',
    'Ebony',
    'Brunette',
    'Redhead',
    'Gamer',
    'Teen',
    'Warrior',
    'Sarcastic',
    'Office Lady',
    'Actress',
    'Movie',
    'Anime Characters',
    'Cartoon Characters',
  ];

  const normalizeValue = (input: string) => input.trim().toLowerCase();
  const seen = new Set<string>();
  const options: TagOption[] = [];

  for (const label of rawLabels) {
    const value = normalizeValue(label);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }

  return options;
})();

const TAG_LABEL_BY_VALUE: Readonly<Record<string, string>> = TAG_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<string, string>
);

const DEFAULT_VISIBLE_TAG_COUNT = 10;

type ApiCharacter = {
  id: string;
  name: string;
  age: number;
  style: 'REALISTIC' | 'ANIME' | 'SEMI_REALISTIC' | 'CARTOON' | 'FURRY' | 'FANTASY';
  gender: 'MALE' | 'FEMALE' | 'TRANS' | 'OTHER';
  tags: string[];
  isNsfw: boolean;
  likeCount: number;
  usageCount: number;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  characterAvatarUrl?: string | null;
  avatarUrls?: string[];
  avatarAsset?: { id: string; url: string | null; width: number | null; height: number | null } | null;
};

type ApiCharactersResponse = {
  items: ApiCharacter[];
  nextCursor: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCreatedAt(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function mapApiCharacterToGirl(character: ApiCharacter): LivecamGirl {
  const metadata = isRecord(character.metadata) ? character.metadata : {};
  const isOnline = typeof metadata.isOnline === 'boolean' ? metadata.isOnline : true;
  const badge = typeof metadata.role === 'string' && metadata.role.trim() ? metadata.role : undefined;

  const style: LivecamGirl['style'] =
    character.style === 'ANIME' || character.style === 'CARTOON' ? 'anime' : 'realistic';

  const gender: LivecamGirl['gender'] =
    character.gender === 'MALE' ? 'male' : character.gender === 'TRANS' ? 'trans' : 'female';

  const urls = Array.isArray(character.avatarUrls) ? character.avatarUrls : [];
  // All non-video image URLs for hover slideshow
  const allImages = urls.filter((u) => !isVideoUrl(u));
  // Primary image: first non-video URL, or characterAvatarUrl
  const firstImage = allImages[0];
  const imageUrl = firstImage || character.characterAvatarUrl || character.avatarAsset?.url || '/images/placeholder.svg';
  // First video for hover preview
  const videoUrl = urls.find((u) => isVideoUrl(u)) ?? null;

  return {
    id: character.id,
    name: character.name,
    age: character.age,
    image: imageUrl,
    images: allImages.length > 1 ? allImages.slice(0, 5) : [],
    videoUrl,
    isOnline,
    badge,
    style,
    gender,
    likeCount: character.likeCount,
    usageCount: character.usageCount,
    createdAt: parseCreatedAt(character.createdAt),
    tags: Array.isArray(character.tags) ? character.tags : [],
    isNsfw: character.isNsfw,
  };
}

type LivecamCategory = 'all' | 'realistic' | 'anime';

const CATEGORY_TABS: Array<{ id: LivecamCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'realistic', label: 'Realistic' },
  { id: 'anime', label: 'Anime' },
];

const SEARCH_PLACEHOLDERS = ['Search Your Partner', 'Busty Blonde', 'Sexy Doctor', 'MILF'] as const;

const CREATE_ENTRY_BG_URL = 'https://image.cdn2.seaart.me/static/web/aiChat/create/entry-bg.webp';

const RECENTS_LIMIT = 10;

const CHARACTER_PAGE_SIZE = 50;

type GenderFilter = 'male' | 'female' | 'trans';
type AgeFilter = 'any' | 'teen' | 'young-adult' | 'mature';
type SortBy = 'popular' | 'most-liked' | 'most-used' | 'newest';

const DEFAULT_GENDER: GenderFilter = 'female';
const DEFAULT_AGE: AgeFilter = 'any';
const DEFAULT_SORT_BY: SortBy = 'popular';

const FILTER_SORT_BY: Array<{ value: SortBy; label: string }> = [
  { value: 'popular', label: 'Popular' },
  { value: 'most-liked', label: 'Most Liked' },
  { value: 'most-used', label: 'Most Used' },
  { value: 'newest', label: 'Newest' },
];

const FILTER_GENDER: Array<{ value: GenderFilter; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'trans', label: 'Trans' },
];

// Age buckets requested by the reference UI (18–55).
const FILTER_AGE: Array<{ value: AgeFilter; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'teen', label: 'Teen (18 - 21)' },
  { value: 'young-adult', label: 'Young Adult (22 - 34)' },
  { value: 'mature', label: 'Mature (35 - 55)' },
];

function getAgeInRange(age: number, range: AgeFilter) {
  switch (range) {
    case 'teen':
      return age >= 18 && age <= 21;
    case 'young-adult':
      return age >= 22 && age <= 34;
    case 'mature':
      return age >= 35 && age <= 55;
    case 'any':
    default:
      return true;
  }
}

function normalize(input: string) {
  return input.trim().toLowerCase();
}

type IndexedLivecamGirl = LivecamGirl & {
  _tagSet: ReadonlySet<string>;
  _searchText: string;
  _popularityScore: number;
};

function buildLivecamIndex(girls: LivecamGirl[]) {
  const indexedGirls: IndexedLivecamGirl[] = [];
  const girlsByCategory: Record<LivecamCategory, IndexedLivecamGirl[]> = {
    all: [],
    realistic: [],
    anime: [],
  };
  const girlsByTag = new Map<string, IndexedLivecamGirl[]>();
  const tagsSet = new Set<string>();

  for (const girl of girls) {
    const normalizedTags = girl.tags.map(normalize);
    const indexedGirl: IndexedLivecamGirl = {
      ...girl,
      tags: normalizedTags,
      _tagSet: new Set(normalizedTags),
      _searchText: normalize([girl.name, ...normalizedTags].join(' ')),
      _popularityScore: girl.usageCount + girl.likeCount * 2,
    };

    indexedGirls.push(indexedGirl);
    girlsByCategory.all.push(indexedGirl);
    girlsByCategory[indexedGirl.style].push(indexedGirl);

    for (const tag of normalizedTags) {
      tagsSet.add(tag);
      const existing = girlsByTag.get(tag);
      if (existing) {
        existing.push(indexedGirl);
      } else {
        girlsByTag.set(tag, [indexedGirl]);
      }
    }
  }

  return {
    indexedGirls,
    girlsByCategory,
    girlsByTag,
    allTags: Array.from(tagsSet).sort((a, b) => a.localeCompare(b)),
  };
}

const CreateCard = memo(function CreateCard() {
  return (
    <div
      className={cn(
        'group relative flex h-[9.66875rem] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-secondary/60 shadow-card transition-[flex-basis] duration-300 ease-out',
        // On hover, the Create entry expands to reveal the "Quick Create / Expert Mode" split UI.
        // Percentages match the reference sizing within a max-width container (collapsed ≈23.3%, expanded ≈46.7% of 1298px).
        'md:flex-none md:basis-[29.5%] md:hover:basis-[46.7%]'
      )}
    >
      {/* Default state: clicking anywhere opens Expert Mode (character creation page). */}
      <Link
        href="/create-your-own-ai-character"
        aria-label="Create your character"
        className="absolute inset-0 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40 transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none group-focus-within:opacity-0 group-focus-within:pointer-events-none"
      >
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Plus className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[18px] leading-[20px] font-semibold text-white">Create</div>
              <div className="mt-0.5 text-[14px] leading-[18px] text-text-secondary">
                Create Your Character
              </div>
            </div>
          </div>
        </div>

        {/* Background image provided by reference UI */}
        <div className="relative mt-auto h-[5.125rem] overflow-hidden">
          <img
            src={CREATE_ENTRY_BG_URL}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-background-secondary/40 to-transparent  opacity-0" />
        </div>
      </Link>

	      {/* Hover state: split into "Quick Create" + "Expert Mode". */}
	      <div className="absolute inset-0 grid grid-cols-2 gap-3 p-3 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
	        <Link
	          href="/create-your-ai-partner-quickmode"
	          aria-label="Quick Create"
	          className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-accent-pink/50 hover:bg-accent-pink/5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
	        >
	          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,62,138,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,62,138,0.07)_1px,transparent_1px)] bg-[size:26px_26px]" />
	          <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/10 via-transparent to-accent-purple/10" />
	          <div className="relative z-10">
	            <div className="flex items-center gap-2 text-white font-semibold text-[18px] leading-[20px]">
	              <Wand2 className="h-5 w-5 text-accent-pink" aria-hidden="true" />
	              Quick Create
	            </div>
	            <div className="mt-3 text-sm leading-snug text-text-secondary">
	              Turn an image into a character instantly with one click
	            </div>
	          </div>
	        </Link>

	        <Link
	          href="/create-your-own-ai-character"
	          aria-label="Expert Mode"
	          className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-[border-color,background-color,box-shadow] hover:border-accent-pink/50 hover:bg-accent-pink/5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
	        >
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,62,138,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,62,138,0.07)_1px,transparent_1px)] bg-[size:26px_26px]" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/5 via-transparent to-accent-purple/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white font-semibold text-[18px] leading-[20px]">
              <Box className="h-5 w-5 text-accent-pink" aria-hidden="true" />
              Expert Mode
            </div>
            <div className="mt-3 text-sm leading-snug text-text-secondary">
              Edit character settings freely with full control
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
});

CreateCard.displayName = 'CreateCard';

interface RecentThread {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatarUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
}

const RecentsCard = memo(function RecentsCard() {
  const [threads, setThreads] = useState<RecentThread[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ items: RecentThread[] }>(`/api/chat/threads?limit=${RECENTS_LIMIT}&archived=false`)
      .then((res) => {
        if (!cancelled) {
          setThreads(res.items);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const hasRecents = threads.length > 0;

  return (
    <div className="relative flex h-[9.66875rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-secondary/60 shadow-card p-3 md:flex-1 md:min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] leading-[20px] font-semibold text-white">Recent Chats</h3>
        {hasRecents && (
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
            aria-label="More recent chats"
          >
            More
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-accent-pink" />
        </div>
      ) : hasRecents ? (
        <div className="flex-1 mt-1 flex items-end">
          <div className="flex max-w-full min-w-0 items-end gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/chat/${thread.characterId}`}
                prefetch={false}
                className="group relative shrink-0 w-[4.75rem] h-[6.5625rem] overflow-hidden rounded-xl border-2 border-white/10 bg-background-tertiary/40 transition-[border-color,box-shadow] hover:border-accent-pink/80 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink/40"
                aria-label={thread.characterName}
                title={thread.characterName}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-background-tertiary to-background-card" />
                {thread.characterAvatarUrl ? (
                  <Image
                    src={thread.characterAvatarUrl}
                    alt={thread.characterName}
                    fill
                    sizes="76px"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40 text-2xl font-bold">
                    {thread.characterName.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background-secondary/70 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-0 right-0 px-1">
                  <div className="text-[10px] leading-tight text-white/90 font-medium truncate text-center">
                    {thread.characterName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
          <div className="text-sm font-semibold text-white/90">Your recent chats will appear here.</div>
          <div className="mt-1 text-sm text-text-secondary">Start chatting to see them here.</div>
        </div>
      )}
    </div>
  );
});

RecentsCard.displayName = 'RecentsCard';

const CharacterCard = memo(function CharacterCard({
  girl,
  index = 0,
}: {
  girl: LivecamGirl;
  /**
   * Position in the rendered grid. Drives the Zero-Waterfall Cascade loading
   * tier — first cards load eagerly with high priority, later cards lazy-load.
   */
  index?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const hasVideo = !!girl.videoUrl;
  const hasSlideshow = !hasVideo && girl.images.length > 1;

  // Tier the image load based on grid position.
  const isHighPriority = index < EAGER_HIGH_PRIORITY_COUNT;
  const isLazy = index >= EAGER_THRESHOLD;

  // DOM-based slideshow refs (avoids React re-renders per tick)
  const slideshowInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideshowImgs = useRef<HTMLImageElement[]>([]);
  const slideshowIdx = useRef(0);
  const slideshowReady = useRef(false);

  // Preload slideshow images into hidden DOM elements on first hover
  const ensureSlideshow = useCallback(() => {
    if (!hasSlideshow || slideshowReady.current) return;
    const container = cardRef.current?.querySelector('.livecam-card-image');
    if (!container) return;
    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i < girl.images.length; i++) {
      const img = document.createElement('img');
      img.src = girl.images[i];
      img.alt = girl.name;
      img.loading = 'eager';
      img.decoding = 'async';
      img.className = 'absolute inset-0 h-full w-full object-cover z-[1]';
      img.style.opacity = i === 0 ? '1' : '0';
      img.style.transition = 'opacity 200ms ease';
      container.insertBefore(img, container.firstChild);
      imgs.push(img);
    }
    slideshowImgs.current = imgs;
    slideshowReady.current = true;
  }, [hasSlideshow, girl.images, girl.name]);

  // Lazy-create the <video> element only on first hover (avoid DOM bloat for 200+ cards)
  const ensureVideo = useCallback(() => {
    if (!hasVideo || videoRef.current) return videoRef.current;
    const vid = document.createElement('video');
    vid.src = girl.videoUrl!;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = 'none';
    vid.className = 'absolute inset-0 h-full w-full object-cover z-[1] transition-opacity duration-300';
    vid.style.opacity = '0';
    vid.style.objectPosition = 'top center';
    const container = cardRef.current?.querySelector('.livecam-card-image');
    if (container) container.insertBefore(vid, container.firstChild);
    videoRef.current = vid;
    return vid;
  }, [hasVideo, girl.videoUrl]);

  const handleMouseEnter = useCallback(() => {

    if (hasVideo) {
      const vid = ensureVideo();
      if (!vid) return;
      vid.style.opacity = '1';
      vid.currentTime = 0;
      void vid.play().catch(() => {});
    } else if (hasSlideshow) {
      ensureSlideshow();
      const imgs = slideshowImgs.current;
      if (imgs.length === 0) return;
      // Show first slideshow image immediately
      slideshowIdx.current = 0;
      imgs[0].style.opacity = '1';
      // Cycle every 700ms — pure DOM, zero React re-renders
      slideshowInterval.current = setInterval(() => {
        const prev = slideshowIdx.current;
        const next = (prev + 1) % imgs.length;
        imgs[prev].style.opacity = '0';
        imgs[next].style.opacity = '1';
        slideshowIdx.current = next;
      }, 700);
    }
  }, [hasVideo, hasSlideshow, ensureVideo, ensureSlideshow]);

  const handleMouseLeave = useCallback(() => {

    if (hasVideo) {
      const vid = videoRef.current;
      if (!vid) return;
      vid.pause();
      vid.style.opacity = '0';
    }
    if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    // Hide all slideshow images so the default Next/Image shows through
    const imgs = slideshowImgs.current;
    for (let i = 0; i < imgs.length; i++) imgs[i].style.opacity = '0';
    slideshowIdx.current = 0;
  }, [hasVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const vid = videoRef.current;
      if (vid) {
        vid.pause();
        vid.src = '';
        vid.remove();
        videoRef.current = null;
      }
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
        slideshowInterval.current = null;
      }
      for (const img of slideshowImgs.current) img.remove();
      slideshowImgs.current = [];
      slideshowReady.current = false;
    };
  }, []);

  const hasImage = girl.image && girl.image !== '/images/placeholder.svg';

  return (
    <Link
      ref={cardRef}
      href={`/chat/${girl.id}`}
      className={cn('livecam-card', (hasVideo || hasSlideshow) && 'group')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Character Media — plain <img> bypasses Next's optimizer. External
          R2/CDN URLs are already fast; piping them through /_next/image adds
          a transcoding hop we don't need. Tiered loading gives above-the-fold
          cards eager high-priority fetches and lazy-loads the rest. */}
      <div className="livecam-card-image">
        {hasImage && (
          <img
            src={girl.image}
            alt={girl.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading={isLazy ? 'lazy' : 'eager'}
            decoding="async"
            // @ts-expect-error — valid HTML attr, React types lag behind
            fetchpriority={isHighPriority ? 'high' : 'auto'}
          />
        )}
        <div className="livecam-card-gradient"></div>

        {/* Badge */}
        {girl.badge && (
          <div className="livecam-card-badge">
            <span className="livecam-card-badge-dot"></span>
            {girl.badge}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="livecam-card-info">
        <span className="livecam-card-status"></span>
        <span className="livecam-card-name">{girl.name}</span>
        <span className="livecam-card-age">({girl.age})</span>
      </div>
    </Link>
  );
});

CharacterCard.displayName = 'CharacterCard';

interface CharacterLobbyProps {
  /**
   * Server-rendered first page. When provided we seed state with this data
   * and skip the initial client-side fetch entirely — the Zero-Waterfall
   * Cascade's whole point. Subsequent pages still come from /api/characters
   * via the existing cursor logic.
   */
  initialCharacters?: LivecamGirl[];
}

export default function CharacterLobby({ initialCharacters }: CharacterLobbyProps = {}) {
  const hasInitialData = Array.isArray(initialCharacters) && initialCharacters.length > 0;
  const [activeCategory, setActiveCategory] = useState<LivecamCategory>('all');
  const { enableNsfw: isNsfwEnabled, setEnableNsfw: setIsNsfwEnabled } = useNsfwPreference();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [areAllTagsShown, setAreAllTagsShown] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(DEFAULT_GENDER);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>(DEFAULT_AGE);
  const [sortBy, setSortBy] = useState<SortBy>(DEFAULT_SORT_BY);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchPlaceholderIndex, setSearchPlaceholderIndex] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleCharacterCount, setVisibleCharacterCount] = useState(CHARACTER_PAGE_SIZE);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const [livecamGirls, setLivecamGirls] = useState<LivecamGirl[]>(
    hasInitialData ? (initialCharacters as LivecamGirl[]) : [],
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // Skip the initial spinner when SSR handed us data — the grid is already
  // painted by the time this component hydrates.
  const [loadingInitial, setLoadingInitial] = useState(!hasInitialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // When SSR seeded us, the first client pagination request has no cursor
  // (SSR ordered by popularity; API orders by createdAt). We let the user
  // click "Show More" once to trigger a cursor-less API fetch, then the
  // returned cursor drives subsequent pages.
  const [hasFetchedClientPage, setHasFetchedClientPage] = useState(!hasInitialData);

  const loadPage = useCallback(async (cursor?: string | null, search?: string) => {
    const params = new URLSearchParams({
      limit: String(CHARACTER_PAGE_SIZE),
      includeNsfw: 'true',
    });
    if (cursor) params.set('cursor', cursor);
    if (search) params.set('search', search);
    return apiFetch<ApiCharactersResponse>(`/api/characters?${params.toString()}`);
  }, []);

  useEffect(() => {
    // Zero-Waterfall Cascade: when SSR data is seeded, don't re-fetch on
    // mount. The grid is already painted and images are already downloading.
    // We'll still fetch cursor-paginated pages on "Show More" / search.
    if (hasInitialData) return;

    let cancelled = false;

    const init = async () => {
      setLoadingInitial(true);
      setLoadError(null);

      try {
        const page = await loadPage(null);
        if (cancelled) return;
        setLivecamGirls(page.items.map(mapApiCharacterToGirl));
        setNextCursor(page.nextCursor ?? null);
      } catch (err) {
        if (cancelled) return;
        setLivecamGirls([]);
        setNextCursor(null);
        setLoadError(err instanceof Error ? err.message : 'Failed to load characters.');
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadPage, hasInitialData]);

  // When the user types a search query, fetch matching characters from the API
  // and merge them into the local list so the client-side filter can find them.
  useEffect(() => {
    if (!deferredSearchQuery) return;
    let cancelled = false;

    void loadPage(null, deferredSearchQuery).then((page) => {
      if (cancelled) return;
      const newGirls = page.items.map(mapApiCharacterToGirl);
      setLivecamGirls((current) => {
        const existingIds = new Set(current.map((g) => g.id));
        const toAdd = newGirls.filter((g) => !existingIds.has(g.id));
        return toAdd.length > 0 ? [...current, ...toAdd] : current;
      });
    }).catch(() => { /* search fetch failed; client-side filter still works for loaded items */ });

    return () => { cancelled = true; };
  }, [deferredSearchQuery, loadPage]);

  const livecamIndex = useMemo(() => buildLivecamIndex(livecamGirls), [livecamGirls]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (genderFilter !== DEFAULT_GENDER) count += 1;
    if (ageFilter !== DEFAULT_AGE) count += 1;
    if (sortBy !== DEFAULT_SORT_BY) count += 1;
    return count;
  }, [genderFilter, ageFilter, sortBy]);

  const resetFilters = () => {
    setGenderFilter(DEFAULT_GENDER);
    setAgeFilter(DEFAULT_AGE);
    setSortBy(DEFAULT_SORT_BY);
  };

  // Rotates the "placeholder" text without impacting typing performance.
  useEffect(() => {
    if (isSearchFocused || searchQuery.trim().length > 0) return;
    const intervalId = window.setInterval(() => {
      setSearchPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2400);
    return () => window.clearInterval(intervalId);
  }, [isSearchFocused, searchQuery]);

  // Close popovers on outside click to keep the UI predictable and scalable.
  useEffect(() => {
    if (!isFilterOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideFilter =
        filterPanelRef.current?.contains(target) ||
        filterButtonRef.current?.contains(target);

      if (isInsideFilter) return;

      setIsFilterOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isFilterOpen]);

  // Escape should close the filter popup (similar to the reference UI).
  useEffect(() => {
    if (!isFilterOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFilterOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen]);

  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const visibleTagOptions = useMemo(() => {
    if (areAllTagsShown) return TAG_OPTIONS;

    // Keep selected tags visible even when collapsed so users can always unselect them.
    const keep = new Set(TAG_OPTIONS.slice(0, DEFAULT_VISIBLE_TAG_COUNT).map((option) => option.value));
    for (const selected of selectedTags) keep.add(selected);

    return TAG_OPTIONS.filter((option) => keep.has(option.value));
  }, [areAllTagsShown, selectedTags]);

  const filteredGirls = useMemo(() => {
    // Tag matching is "hybrid": show exact matches first, then progressively fewer matches,
    // down to any single-tag match (per product requirement).
    const q = normalize(deferredSearchQuery);
    const normalizedSelectedTags = selectedTags.map(normalize).filter(Boolean);
    const selectedTagsSet = new Set(normalizedSelectedTags);

    const compareBySort = (a: IndexedLivecamGirl, b: IndexedLivecamGirl) => {
      switch (sortBy) {
        case 'popular':
          return (
            (b._popularityScore - a._popularityScore) ||
            (b.likeCount - a.likeCount) ||
            (b.usageCount - a.usageCount) ||
            (b.createdAt - a.createdAt)
          );
        case 'most-liked':
          return (
            (b.likeCount - a.likeCount) ||
            (b.usageCount - a.usageCount) ||
            (b.createdAt - a.createdAt)
          );
        case 'most-used':
          return (
            (b.usageCount - a.usageCount) ||
            (b.likeCount - a.likeCount) ||
            (b.createdAt - a.createdAt)
          );
        case 'newest':
          return (
            (b.createdAt - a.createdAt) ||
            (b._popularityScore - a._popularityScore)
          );
        default:
          return 0;
      }
    };

    const categoryCandidates = livecamIndex.girlsByCategory[activeCategory];

    // If tags are selected, build a de-duplicated candidate list from the tag index so we don't scan
    // the full dataset unnecessarily.
    const primaryCandidates: IndexedLivecamGirl[] =
      selectedTagsSet.size === 0
        ? categoryCandidates
        : (() => {
            const seen = new Set<string>();
            const union: IndexedLivecamGirl[] = [];
            for (const tag of selectedTagsSet) {
              const bucket = livecamIndex.girlsByTag.get(tag);
              if (!bucket) continue;
              for (const girl of bucket) {
                if (activeCategory !== 'all' && girl.style !== activeCategory) continue;
                if (seen.has(girl.id)) continue;
                seen.add(girl.id);
                union.push(girl);
              }
            }
            return union;
          })();

    const results: Array<{ girl: IndexedLivecamGirl; matchCount: number }> = [];
    for (const girl of primaryCandidates) {
      if (!isNsfwEnabled && girl.isNsfw) continue;
      if (selectedTagsSet.size === 0 && activeCategory !== 'all' && girl.style !== activeCategory) continue;
      if (girl.gender !== genderFilter) continue;
      if (!getAgeInRange(girl.age, ageFilter)) continue;
      if (q && !girl._searchText.includes(q)) continue;

      let matchCount = 0;
      if (selectedTagsSet.size > 0) {
        for (const tag of selectedTagsSet) {
          if (girl._tagSet.has(tag)) matchCount += 1;
        }
        if (matchCount === 0) continue;
      }

      results.push({ girl, matchCount });
    }

    results.sort((a, b) => {
      if (selectedTagsSet.size > 0) {
        const matchDiff = b.matchCount - a.matchCount;
        if (matchDiff !== 0) return matchDiff;
      }
      return compareBySort(a.girl, b.girl);
    });

    return results.map((entry) => entry.girl);
  }, [
    activeCategory,
    isNsfwEnabled,
    selectedTags,
    genderFilter,
    ageFilter,
    sortBy,
    deferredSearchQuery,
    livecamIndex,
  ]);

  // Reset pagination whenever filters/search change so the grid stays predictable.
  useEffect(() => {
    setVisibleCharacterCount(CHARACTER_PAGE_SIZE);
  }, [activeCategory, selectedTags, genderFilter, ageFilter, sortBy, isNsfwEnabled, deferredSearchQuery]);

  const visibleGirls = useMemo(
    () => filteredGirls.slice(0, visibleCharacterCount),
    [filteredGirls, visibleCharacterCount]
  );

  const canShowMore =
    filteredGirls.length > visibleCharacterCount ||
    Boolean(nextCursor) ||
    !hasFetchedClientPage;

  /* ---- Extracted handlers to avoid new function instances on every render ---- */

  const handleCategoryClick = useCallback((id: LivecamCategory) => {
    setActiveCategory(id);
  }, []);

  const handleNsfwToggle = useCallback(() => {
    void setIsNsfwEnabled(!isNsfwEnabled);
  }, [isNsfwEnabled, setIsNsfwEnabled]);

  const handleSortByClick = useCallback((value: SortBy) => {
    setSortBy(value);
  }, []);

  const handleGenderClick = useCallback((value: GenderFilter) => {
    setGenderFilter(value);
  }, []);

  const handleAgeClick = useCallback((value: AgeFilter) => {
    setAgeFilter(value);
  }, []);

  const handleClearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const handleTagToggle = useCallback((tagValue: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagValue)) {
        return prev.filter((value) => value !== tagValue);
      }
      return [...prev, tagValue];
    });
  }, []);

  const handleAllTagsToggle = useCallback(() => {
    setIsFilterOpen(false);
    setAreAllTagsShown((v) => !v);
  }, []);

  const handleShowMore = useCallback(() => {
    if (filteredGirls.length > visibleCharacterCount) {
      setVisibleCharacterCount((count) => count + CHARACTER_PAGE_SIZE);
      return;
    }

    // SSR seeded us but the API hasn't been hit yet — fetch page 1 from the
    // API to obtain a valid cursor and to top up the grid with the newest
    // characters (SSR ordered by popularity).
    const needsBootstrapPage = !nextCursor && !hasFetchedClientPage;
    if (!nextCursor && !needsBootstrapPage) return;
    if (loadingMore) return;

    setLoadingMore(true);
    setLoadError(null);

    void loadPage(needsBootstrapPage ? null : nextCursor)
      .then((page) => {
        setLivecamGirls((current) => {
          const existingIds = new Set(current.map((g) => g.id));
          const fresh = page.items
            .map(mapApiCharacterToGirl)
            .filter((g) => !existingIds.has(g.id));
          return fresh.length > 0 ? [...current, ...fresh] : current;
        });
        setNextCursor(page.nextCursor ?? null);
        setHasFetchedClientPage(true);
        setVisibleCharacterCount((count) => count + CHARACTER_PAGE_SIZE);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load more characters.');
      })
      .finally(() => setLoadingMore(false));
  }, [filteredGirls.length, loadPage, loadingMore, nextCursor, visibleCharacterCount, hasFetchedClientPage]);

  return (
    <section className="livecam-section">
      <h2 className="sr-only">Character Lobby</h2>

      {/* Create + Recents (UI-only for now; functionality will be wired later). */}
      <div className="mb-4 w-full max-w-[81.125rem] overflow-x-hidden">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-stretch">
          <CreateCard />
          <RecentsCard />
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Failed to load characters from the database. {loadError}
        </div>
      )}

      {loadingInitial && !loadError && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary">
          Loading characters…
        </div>
      )}

      {/* Filters + Search (matches the Home reference UI) */}
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-white/10">
          <div className="flex items-end">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryClick(tab.id)}
                className={cn(
                  // Fixed widths keep the tab spacing consistent and the underline centered.
                  'relative shrink-0 pb-4 w-[100px] sm:w-[140px] md:w-[160px] text-center text-sm sm:text-base font-semibold text-text-secondary hover:text-white transition-colors',
                  activeCategory === tab.id &&
                    'text-white after:absolute after:left-0 after:-bottom-px after:h-[2px] after:w-full after:bg-accent-pink after:rounded-full'
                )}
              >
                <span className="inline-flex w-full items-center justify-center gap-2">
                  {tab.id === 'realistic' && (
                    <span className="text-accent-pink text-base leading-none" aria-hidden="true">
                      ♀
                    </span>
                  )}
                  {tab.id === 'anime' && (
                    <Sparkles
                      className={cn(
                        'w-4 h-4',
                        activeCategory === tab.id ? 'text-white' : 'text-text-secondary'
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}

            <div className="flex items-center gap-2 pb-4 shrink-0 ml-[0.9rem]">
              <span className="text-sm font-semibold text-text-secondary">NSFW</span>
              <button
                type="button"
                role="switch"
                aria-checked={isNsfwEnabled}
                onClick={handleNsfwToggle}
                className={cn('toggle-switch', isNsfwEnabled && 'toggle-switch-active')}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-4">
            <div className="relative flex items-center w-full md:w-[340px]">
              <Search className="absolute left-3 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder=""
                className="w-full pl-10 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/40"
                aria-label="Search partners"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {!isSearchFocused && searchQuery.trim().length === 0 && (
                <div className="absolute inset-y-0 left-10 right-4 flex items-center pointer-events-none">
                  <span
                    key={searchPlaceholderIndex}
                    className="text-sm text-text-muted animate-fade-in"
                  >
                    {SEARCH_PLACEHOLDERS[searchPlaceholderIndex]}
                  </span>
                </div>
              )}
            </div>

            <div className="relative shrink-0">
	              <button
	                ref={filterButtonRef}
	                type="button"
	                aria-label="Open filters"
	                aria-haspopup="dialog"
	                aria-expanded={isFilterOpen}
	                onClick={() => setIsFilterOpen((v) => !v)}
	                className={cn(
	                  'relative p-2.5 rounded-full border transition-colors',
	                  isFilterOpen || activeFilterCount > 0
	                    ? 'bg-accent-pink/20 border-accent-pink/30 hover:bg-accent-pink/25'
	                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                <Filter
                  className={cn(
                    'w-5 h-5',
                    isFilterOpen || activeFilterCount > 0 ? 'text-white' : 'text-text-secondary'
                  )}
                />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-pink text-[11px] leading-[18px] text-white text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <div
                  ref={filterPanelRef}
                  role="dialog"
                  aria-label="Filters"
                  className="absolute right-0 mt-3 w-[min(600px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-background-secondary/95 backdrop-blur-md shadow-card p-6 z-30"
                >
                  <div className="space-y-7">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Sort By</h3>
                      <div className="flex flex-wrap gap-3">
                        {FILTER_SORT_BY.map((option) => {
                          const isSelected = sortBy === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleSortByClick(option.value)}
                              className={cn(
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                                isSelected
                                  ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                                  : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {isSelected && <Check className="w-4 h-4 text-accent-pink" aria-hidden="true" />}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Gender</h3>
                      <div className="flex flex-wrap gap-3">
                        {FILTER_GENDER.map((option) => {
                          const isSelected = genderFilter === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleGenderClick(option.value)}
                              className={cn(
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                                isSelected
                                  ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                                  : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {isSelected && <Check className="w-4 h-4 text-accent-pink" aria-hidden="true" />}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4">Age</h3>
                      <div className="flex flex-wrap gap-3">
                        {FILTER_AGE.map((option) => {
                          const isSelected = ageFilter === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleAgeClick(option.value)}
                              className={cn(
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                                isSelected
                                  ? 'bg-accent-pink/15 border-accent-pink/50 text-white'
                                  : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {isSelected && <Check className="w-4 h-4 text-accent-pink" aria-hidden="true" />}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="w-full py-3.5 rounded-xl border border-accent-pink/40 text-white text-lg font-semibold hover:bg-accent-pink/10 transition-colors"
                    >
                      Reset Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
	        </div>
	
		        <div className="pt-3 flex items-start justify-between gap-3">
		          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-x-2 gap-y-2 pb-1">
		            <button
		              type="button"
		              onClick={handleClearTags}
	              className={cn(
	                'px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap',
	                selectedTags.length === 0
	                  ? 'bg-white text-background-primary border-transparent'
	                  : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-white'
	              )}
	            >
	              All
	            </button>
	
	            {visibleTagOptions.map((tag) => {
	              const isSelected = selectedTagSet.has(tag.value);
	              return (
	                <button
	                  key={tag.value}
	                  type="button"
	                  onClick={() => handleTagToggle(tag.value)}
	                  className={cn(
	                    'px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap',
	                    isSelected
	                      ? 'bg-white text-background-primary border-transparent'
	                      : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-white'
	                  )}
	                >
	                  {TAG_LABEL_BY_VALUE[tag.value] ?? tag.label}
	                </button>
	              );
	            })}
	          </div>
	
	          <div className="relative shrink-0">
	            <button
	              type="button"
	              onClick={handleAllTagsToggle}
	              aria-pressed={areAllTagsShown}
	              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-pink/20 border border-accent-pink/30 text-sm text-white hover:bg-accent-pink/25 transition-colors"
	            >
	              {areAllTagsShown ? 'Less Tags' : 'All Tags'}
	              <ChevronDown
	                className={cn(
	                  'w-4 h-4 text-white/80 transition-transform',
	                  areAllTagsShown && 'rotate-180'
	                )}
	              />
	            </button>
	          </div>
	        </div>
	      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {visibleGirls.map((girl, idx) => (
          <CharacterCard key={girl.id} girl={girl} index={idx} />
        ))}
      </div>

      {canShowMore && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleShowMore}
            disabled={loadingMore}
            className={cn(
              "w-full py-3.5 rounded-xl border border-accent-pink/40 text-white text-lg font-semibold transition-colors",
              loadingMore ? "opacity-60 cursor-not-allowed" : "hover:bg-accent-pink/10"
            )}
          >
            {loadingMore ? 'Loading…' : 'Show More'}
          </button>
        </div>
      )}
    </section>
  );
}
