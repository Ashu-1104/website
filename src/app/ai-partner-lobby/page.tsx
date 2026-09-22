// Force dynamic — the lobby is personalised (popularity changes constantly)
// and we rely on the fresh SSR payload to pre-populate the grid. See
// getLobbyInitialCharacters() for the zero-waterfall SSR strategy.
export const dynamic = 'force-dynamic';
export const revalidate = 300; // re-fetch every 5 minutes

import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LivecamHero from '@/components/LivecamHero';
import CharacterLobby from '@/components/CharacterLobby';
import { SidebarProvider } from '@/context/SidebarContext';
import { getLobbyInitialCharacters } from '@/lib/characters-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// Number of cards preloaded in <head> via <link rel="preload">. Tuned to the
// number typically visible above the fold on desktop (5-col grid × ~2 rows).
const PRELOAD_COUNT = 10;

export const metadata: Metadata = {
  title: 'AI Partner Lobby — Browse & Chat with AI Companions | Veloura.ai',
  description:
    'Browse all AI girlfriends, boyfriends, and custom companions. Pick your partner and start chatting — uncensored, no restrictions, free to start.',
  alternates: { canonical: `${APP_URL}/ai-partner-lobby` },
  robots: { index: true, follow: true },
};

export default async function AIPartnerLobbyPage() {
  // ── Zero-Waterfall Cascade ──────────────────────────────────────────────
  // Fetch the first page of popular characters on the server so the HTML
  // the browser receives already contains every <img src>. Parallel with
  // JS download + hydration, the browser is already pulling the hero
  // avatars — no client-side fetch waterfall.
  let initialCharacters: Awaited<ReturnType<typeof getLobbyInitialCharacters>> = [];
  try {
    initialCharacters = await getLobbyInitialCharacters(50);
  } catch (error) {
    // Database unavailable / transient — fall through to client-side fetch.
    // eslint-disable-next-line no-console
    console.error('[ai-partner-lobby] SSR character load failed:', error);
  }

  // Preload the hero slice. Browser sees these <link> tags before the body
  // parses and starts fetching immediately — this is the single biggest
  // perceived-speed win.
  const preloadTargets = initialCharacters
    .slice(0, PRELOAD_COUNT)
    .map((c) => c.image)
    .filter((url): url is string => Boolean(url) && !url.startsWith('/images/placeholder'));

  return (
    <SidebarProvider>
      {/* Preload above-the-fold character avatars. Next's App Router hoists
          <link> elements rendered in the page tree into <head>. */}
      {preloadTargets.map((url) => (
        <link
          key={url}
          rel="preload"
          as="image"
          href={url}
          // @ts-expect-error — fetchpriority is a valid HTML attribute React
          // types haven't fully adopted yet.
          fetchpriority="high"
        />
      ))}

      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <LivecamHero />
            <CharacterLobby initialCharacters={initialCharacters} />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
