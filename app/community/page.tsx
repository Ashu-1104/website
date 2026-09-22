'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import CommunityFeed from '@/components/community/CommunityFeed';

export default function CommunityPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <CommunityFeed />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}

