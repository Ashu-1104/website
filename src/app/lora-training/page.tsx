'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SidebarProvider } from '@/context/SidebarContext';
import LoraTrainingPlayground from '@/components/training/LoraTrainingPlayground';
import LoraTrainingSEOContent from '@/components/lora-training/LoraTrainingSEOContent';

export default function LoraTrainingPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <h1 className="page-title">LoRA Model Training</h1>
            <p className="mt-2 text-text-secondary">
              Train a custom LoRA model on your character&apos;s images for high-quality, consistent image generation.
            </p>
            <LoraTrainingPlayground />
            <LoraTrainingSEOContent />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
