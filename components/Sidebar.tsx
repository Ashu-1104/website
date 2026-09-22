'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PersonStanding,
  MessageCircle,
  Image as ImageIcon,
  Sparkles,
  Cpu,
  AppWindow,
  LayoutGrid,
  Headphones,
  AudioLines,
  Copy,
  Disc3,
  Mic,
  Music,
  Volume2,
  Video,
  Pencil,
  Menu,
  ChevronRight,
  Zap,
  Share2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/context/SidebarContext';
import { aiAudioTools, type AIAudioToolSlug } from '@/data/aiAudioTools';
import { DEFAULT_SIDEBAR_LOGO_VIDEOS } from '@/lib/sidebarLogoVideos';

function pickRandom(items: string[]) {
  const safeItems = items.filter(Boolean);
  if (safeItems.length === 0) return '';
  const randomIndex = Math.floor(Math.random() * safeItems.length);
  return safeItems[randomIndex] ?? '';
}

// Custom Reddit icon
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

// Custom X (Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Custom Discord icon
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

type SidebarDropdownId = 'create' | 'ai-audio' | 'social';

type SidebarDropdownItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type SidebarLinkItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  dropdownId?: SidebarDropdownId;
};

const sidebarLinks: ReadonlyArray<SidebarLinkItem> = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/ai-partner-lobby', icon: PersonStanding, label: 'AI Partner Lobby' },
  { href: '/community', icon: LayoutGrid, label: 'Community Feed' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/create', icon: Sparkles, label: 'Generate', dropdownId: 'create' },
  { href: '/models', icon: Cpu, label: 'AI Models' },
  { href: '/ai-audio', icon: Headphones, label: 'AI Audio', dropdownId: 'ai-audio' },
  { href: '/ai-apps', icon: AppWindow, label: 'AI Apps' },
  { href: '/lora-training', icon: Zap, label: 'LoRA Training' },
];

const createDropdownItems: ReadonlyArray<SidebarDropdownItem> = [
  { href: '/create?type=image', icon: ImageIcon, label: 'Generate Image' },
  { href: '/create/video', icon: Video, label: 'Generate Video' },
  { href: '/edit-image', icon: Pencil, label: 'Edit Image' },
];

const aiAudioIconBySlug: Record<AIAudioToolSlug, LucideIcon> = {
  'text-to-speech': AudioLines,
  'voice-cloning': Copy,
  'sound-effect': Volume2,
  'song-cover-fun': Disc3,
  'song-generation-vocal': Mic,
  'music-generation-no-vocal': Music,
};

const aiAudioDropdownItems: ReadonlyArray<SidebarDropdownItem> = aiAudioTools.map((tool) => ({
  href: `/ai-audio/${tool.slug}`,
  icon: aiAudioIconBySlug[tool.slug],
  label: tool.label,
}));

const dropdownItemsById: Record<SidebarDropdownId, ReadonlyArray<SidebarDropdownItem>> = {
  create: createDropdownItems,
  'ai-audio': aiAudioDropdownItems,
  social: [],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar, closeSidebar } = useSidebar();
  const [openDropdownId, setOpenDropdownId] = useState<SidebarDropdownId | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const [randomVideoUrl, setRandomVideoUrl] = useState(() => pickRandom(DEFAULT_SIDEBAR_LOGO_VIDEOS));

  useEffect(() => {
    let cancelled = false;
    const loadLogoVideos = async () => {
      try {
        const res = await fetch('/api/sidebar-logo');
        const data = (await res.json()) as { videos?: Array<{ videoUrl?: string | null }> };
        if (!res.ok || !Array.isArray(data.videos)) return;
        const urls = data.videos.map((video) => video.videoUrl || '').filter(Boolean);
        if (!cancelled && urls.length > 0) setRandomVideoUrl(pickRandom(urls));
      } catch {
        // Keep fallback
      }
    };
    void loadLogoVideos();
    return () => { cancelled = true; };
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Check if click is on the header hamburger button
        const target = event.target as HTMLElement;
        if (target.closest('.topbar-hamburger')) {
          return;
        }
        closeSidebar();
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, closeSidebar]);

  // Close dropdown when sidebar collapses
  useEffect(() => {
    if (!isExpanded) {
      setOpenDropdownId(null);
    }
  }, [isExpanded]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    closeSidebar();
    setOpenDropdownId(null);
  }, [pathname, closeSidebar]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isExpanded && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <aside ref={sidebarRef} className={cn('sidebar', isExpanded && 'sidebar-expanded')}>
      {/* Hamburger Menu */}
      <button
        className="sidebar-hamburger"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="sidebar-hamburger-icon" />
      </button>

      {/* Logo with Video */}
      <Link href="/create-your-own-ai-character" className="sidebar-logo">
        <div className="sidebar-logo-video">
          <video
            src={randomVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="sidebar-logo-video-element"
          />
        </div>
        <span className={cn('sidebar-logo-text', !isExpanded && 'sidebar-text-hidden')}>
          Create AI Girlfriend
        </span>
        <span className="sidebar-logo-tooltip">Create AI Girlfriend</span>
      </Link>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {sidebarLinks.map((link) => {
          // Special handling for links with dropdown
          if (link.dropdownId) {
            const dropdownId = link.dropdownId;
            const isDropdownOpen = openDropdownId === dropdownId;
            const dropdownItems = dropdownItemsById[dropdownId];

            return (
              <div
                key={link.href}
                className="sidebar-dropdown-container"
                onMouseEnter={() => setOpenDropdownId(dropdownId)}
                onMouseLeave={() => setOpenDropdownId((current) => (current === dropdownId ? null : current))}
              >
                <button
                  className={cn(
                    'sidebar-link',
                    isActive(link.href) && 'sidebar-link-active'
                  )}
                >
                  <link.icon className="sidebar-icon" />
                  <span className={cn('sidebar-label', !isExpanded && 'sidebar-text-hidden')}>
                    {link.label}
                  </span>
                  <ChevronRight className={cn(
                    'sidebar-chevron',
                    isDropdownOpen && 'sidebar-chevron-open',
                    !isExpanded && 'sidebar-text-hidden'
                  )} />
                  <span className="sidebar-tooltip">{link.label}</span>
                </button>

                {isDropdownOpen && (
                  <div className="sidebar-dropdown">
                    {dropdownItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="sidebar-dropdown-item"
                        onClick={() => setOpenDropdownId(null)}
                      >
                        <item.icon className="sidebar-dropdown-icon" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'sidebar-link',
                isActive(link.href) && 'sidebar-link-active'
              )}
            >
              <link.icon className="sidebar-icon" />
              <span className={cn('sidebar-label', !isExpanded && 'sidebar-text-hidden')}>
                {link.label}
              </span>
              <span className="sidebar-tooltip">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Social Links – single icon with hover dropdown */}
      <div className="sidebar-social">
        <div
          className="sidebar-dropdown-container"
          onMouseEnter={() => setOpenDropdownId('social')}
          onMouseLeave={() => setOpenDropdownId((c) => (c === 'social' ? null : c))}
        >
          <button className="sidebar-link">
            <Share2 className="sidebar-icon" />
            <span className={cn('sidebar-label', !isExpanded && 'sidebar-text-hidden')}>
              Socials
            </span>
            <ChevronRight className={cn(
              'sidebar-chevron',
              openDropdownId === 'social' && 'sidebar-chevron-open',
              !isExpanded && 'sidebar-text-hidden'
            )} />
            <span className="sidebar-tooltip">Socials</span>
          </button>

          {openDropdownId === 'social' && (
            <div className="sidebar-dropdown sidebar-dropdown-bottom">
              <a href="https://reddit.com" target="_blank" rel="noopener noreferrer" className="sidebar-dropdown-item" onClick={() => setOpenDropdownId(null)}>
                <RedditIcon className="sidebar-dropdown-icon" />
                <span>Reddit</span>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="sidebar-dropdown-item" onClick={() => setOpenDropdownId(null)}>
                <XIcon className="sidebar-dropdown-icon" />
                <span>X</span>
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="sidebar-dropdown-item" onClick={() => setOpenDropdownId(null)}>
                <DiscordIcon className="sidebar-dropdown-icon" />
                <span>Discord</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
