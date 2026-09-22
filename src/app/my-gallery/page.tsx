'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import { GalleryTab, GeneratedImage, GeneratedVideo, AICharacter } from '@/types';
import { cn } from '@/lib/utils';
import { loadLocalPartners } from '@/lib/localPartners';
import { AIPartnerGrid, ImageGrid, VideoGrid } from '@/components/gallery/GalleryGrids';

// Tab component
function GalleryTabs({
  activeTab,
  onTabChange
}: {
  activeTab: GalleryTab;
  onTabChange: (tab: GalleryTab) => void;
}) {
  return (
    <div className="gallery-tabs">
      <button
        type="button"
        className={cn('gallery-tab', activeTab === 'images' && 'gallery-tab-active')}
        onClick={() => onTabChange('images')}
      >
        Images
      </button>
      <button
        type="button"
        className={cn('gallery-tab', activeTab === 'videos' && 'gallery-tab-active')}
        onClick={() => onTabChange('videos')}
      >
        Videos
      </button>
      <button
        type="button"
        className={cn('gallery-tab', activeTab === 'partners' && 'gallery-tab-active')}
        onClick={() => onTabChange('partners')}
      >
        AI Partners
      </button>
    </div>
  );
}

// Main gallery content component
function GalleryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get active tab from URL, default to 'images'
  const tabParam = searchParams.get('tab');
  const activeTab: GalleryTab =
    tabParam === 'videos' ? 'videos' :
    tabParam === 'partners' || tabParam === 'characters' ? 'partners' :
    'images';

  // For now, using empty arrays - will be replaced with database data
  // In the future, this would use React Query, SWR, or server components
  const images: GeneratedImage[] = [];
  const videos: GeneratedVideo[] = [];
  const [partners, setPartners] = useState<AICharacter[]>([]);

  // Temporary local persistence until the backend is wired (so newly created partners show in My Gallery).
  useEffect(() => {
    setPartners(loadLocalPartners());
  }, []);

  const handleTabChange = (tab: GalleryTab) => {
    router.push(`/my-gallery?tab=${tab}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'images':
        return <ImageGrid images={images} />;
      case 'videos':
        return <VideoGrid videos={videos} />;
      case 'partners':
        return <AIPartnerGrid partners={partners} />;
      default:
        return <ImageGrid images={images} />;
    }
  };

  return (
    <>
      <GalleryTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="gallery-content">
        {renderContent()}
      </div>
    </>
  );
}

export default function MyGalleryPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <section className="gallery-section">
              <Suspense fallback={<div className="gallery-loading">Loading...</div>}>
                <GalleryContent />
              </Suspense>
            </section>
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
