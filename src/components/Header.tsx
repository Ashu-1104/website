'use client';

import { useState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, CreditCard, Crown, LogOut, Menu, Settings, Plus, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { useLocalProfileSettings } from '@/components/profile/useLocalProfile';

// Custom Chat Icon - filled speech bubble with three dots
const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/>
    <circle cx="8" cy="10" r="1.5" fill="#0a0a0f"/>
    <circle cx="12" cy="10" r="1.5" fill="#0a0a0f"/>
    <circle cx="16" cy="10" r="1.5" fill="#0a0a0f"/>
  </svg>
);

const PROMO_BANNER_DISMISSED_KEY = 'promo_banner_dismissed';

export default function Header() {
  const [credits] = useState(25);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const isChatActive = pathname.startsWith('/chat');
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const { profile, avatarDecorationClassName } = useLocalProfileSettings();
  const userMenuId = useId();
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Use auth user handle or fallback to local profile
  const handle = user?.handle || 'User';

  // Check localStorage on mount to persist banner dismissed state across pages
  useEffect(() => {
    const isDismissed = localStorage.getItem(PROMO_BANNER_DISMISSED_KEY) === 'true';
    setIsBannerVisible(!isDismissed);
    if (isDismissed) {
      document.body.classList.add('banner-hidden');
    }
  }, []);

  // Close profile dropdown on outside click / Escape
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideMenu = userMenuRef.current?.contains(target);
      const isInsideButton = userButtonRef.current?.contains(target);
      if (!isInsideMenu && !isInsideButton) setIsUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Handle scroll to toggle transparent header (throttled via passive listener)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 0);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCloseBanner = () => {
    setIsBannerVisible(false);
    localStorage.setItem(PROMO_BANNER_DISMISSED_KEY, 'true');
    document.body.classList.add('banner-hidden');
  };

  const avatarInitial = handle.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    // Also clear legacy localStorage
    try {
      window.localStorage.removeItem('vp:user:id');
      window.localStorage.removeItem('vp:user:handle');
    } catch {}
    window.location.assign('/');
  };

  return (
    <header className={cn('topbar', isScrolled && 'topbar-transparent')}>
      <div className="topbar-container">
        {/* Left side: Hamburger + Logo */}
        <div className="topbar-left">
          {/* Hamburger Menu */}
          <button
            className="topbar-hamburger"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="topbar-hamburger-icon" />
          </button>

          {/* Logo */}
          <Link href="/" className="topbar-logo">
            <Image
              src="/images/logo.svg"
              alt="Veloura.ai"
              width={36}
              height={36}
              className="topbar-logo-image"
              priority
            />
            <span className="topbar-logo-text">Veloura.ai</span>
          </Link>
        </div>

        {/* Right Side */}
        <div className="topbar-right">

          {/* Credits - only show when authenticated */}
          {isAuthenticated && (
            <button className="topbar-credits">
              <span className="topbar-credits-icon">$</span>
              <span className="topbar-credits-amount">{credits}</span>
              <Plus className="topbar-credits-plus" />
            </button>
          )}

          {/* Chat - only show when authenticated */}
          {isAuthenticated && (
            <Link
              href="/chat"
              className={cn('topbar-chat', isChatActive && 'topbar-chat-active')}
              aria-label="Chat"
            >
              <ChatIcon />
            </Link>
          )}

          {/* User Avatar / Auth Buttons */}
          {authLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="topbar-user-wrapper">
              <button
                ref={userButtonRef}
                type="button"
                className={cn('topbar-user', isUserMenuOpen && 'topbar-user-open')}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-controls={userMenuId}
                onClick={() => setIsUserMenuOpen((open) => !open)}
              >
                <div className={cn('topbar-avatar overflow-hidden', avatarDecorationClassName)}>
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : profile.avatarDataUrl ? (
                    <Image
                      src={profile.avatarDataUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>
                <span className="topbar-username" suppressHydrationWarning>Hello {handle}</span>
                <ChevronDown className={cn('topbar-user-chevron', isUserMenuOpen && 'topbar-user-chevron-open')} />
              </button>

              {isUserMenuOpen && (
                <div
                  ref={userMenuRef}
                  id={userMenuId}
                  role="menu"
                  aria-label="Profile menu"
                  className="topbar-user-menu"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="topbar-user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="topbar-user-menu-icon" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="topbar-user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="topbar-user-menu-icon" />
                    Settings
                  </Link>
                  <Link
                    href="/subscription"
                    role="menuitem"
                    className="topbar-user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Crown className="topbar-user-menu-icon" />
                    Subscription
                  </Link>
                  <Link
                    href="/billing"
                    role="menuitem"
                    className="topbar-user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <CreditCard className="topbar-user-menu-icon" />
                    Billing
                  </Link>

                  <div className="topbar-user-menu-separator" role="separator" />

                  <button
                    type="button"
                    role="menuitem"
                    className="topbar-user-menu-item topbar-user-menu-item-danger"
                    onClick={handleLogout}
                  >
                    <LogOut className="topbar-user-menu-icon" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={openRegister}
                className="topbar-auth-btn topbar-auth-btn-primary"
              >
                <span className="topbar-auth-btn-full">Create Free Account</span>
                <span className="topbar-auth-btn-short">Sign Up</span>
              </button>
              <button
                type="button"
                onClick={openLogin}
                className="topbar-auth-btn topbar-auth-btn-outline"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Promo Banner */}
      {isBannerVisible && (
        <div className="promo-banner">
          <span className="promo-banner-emoji">🎁</span>
          <span className="promo-banner-text">Collect the gift tokens!</span>
          <span className="promo-banner-emoji">🎁</span>
          <Link href="/claim" className="promo-banner-link">
            Claim your tokens now!
          </Link>
          <button
            onClick={handleCloseBanner}
            className="promo-banner-close"
            aria-label="Close banner"
          >
            <X className="promo-banner-close-icon" />
          </button>
        </div>
      )}
    </header>
  );
}
