'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import AIModelsPage from '@/components/models/AIModelsPage';

export default function ModelsPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <AIModelsPage />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}

