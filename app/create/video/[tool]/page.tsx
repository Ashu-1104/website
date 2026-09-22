'use client';

import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';

const toolLabels: Record<string, string> = {
  'video-editor': 'Video Editor',
  'background-remover': 'Background Remover',
  'reels-maker': 'Reels Maker',
  'video-dubbing': 'Video Dubbing',
  'video-upscaler': 'Video Upscaler',
  'video-reference': 'Video Reference',
};

export default function VideoToolPage({ params }: { params: { tool: string } }) {
  const label = toolLabels[params.tool] || 'Video Tool';

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/create/video"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Video Tools</span>
              </Link>
              <h1 className="page-title">{label}</h1>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-24 px-8 text-center">
              <Construction className="h-16 w-16 text-purple-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
              <p className="text-text-secondary max-w-md">
                The {label} playground is currently under development. Check back soon for updates!
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
