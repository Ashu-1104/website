'use client';

import Link from 'next/link';
import { ArrowLeft, Film, Scissors, ImageMinus, Clapperboard, Mic, ArrowUpCircle, MonitorPlay, PersonStanding } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider } from '@/context/SidebarContext';
import VideoHubSeoBlock from './VideoHubSeoBlock';

const videoTools = [
  {
    slug: 'generator',
    label: 'AI Video Generator',
    description: 'Generate stunning videos from text prompts',
    icon: Film,
    popular: false,
  },
  {
    slug: 'video-editor',
    label: 'Video Editor',
    description: 'Edit videos with AI-powered tools',
    icon: Scissors,
    popular: false,
  },
  {
    slug: 'background-remover',
    label: 'Background Remover',
    description: 'Remove backgrounds with AI precision',
    icon: ImageMinus,
    popular: false,
  },
  {
    slug: 'reels-maker',
    label: 'Reels Maker',
    description: 'Create viral social media reels',
    icon: Clapperboard,
    popular: true,
  },
  {
    slug: 'video-dubbing',
    label: 'Video Dubbing',
    description: 'Add professional voiceovers',
    icon: Mic,
    popular: true,
  },
  {
    slug: 'video-upscaler',
    label: 'Video Upscaler',
    description: 'Enhance resolution up to 8K',
    icon: ArrowUpCircle,
    popular: false,
  },
  {
    slug: 'video-reference',
    label: 'Video Reference',
    description: 'Generate videos from reference images',
    icon: MonitorPlay,
    popular: false,
  },
  {
    slug: 'motion-transfer',
    label: 'Motion Transfer',
    description: 'Create AI dance videos and animations',
    icon: PersonStanding,
    popular: true,
  },
];

export default function VideoToolsPage() {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
              <h1 className="page-title">AI Video Tools — Generate, Edit, Upscale &amp; Animate</h1>
            </div>

            <div className="video-tools-grid">
              {videoTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/create/video/${tool.slug}`}
                  className="video-tool-card"
                >
                  {tool.popular && (
                    <span className="video-tool-badge">Popular</span>
                  )}
                  <div className="video-tool-card-media">
                    <tool.icon className="video-tool-card-icon" />
                  </div>
                  <div className="video-tool-card-footer">
                    <div className="video-tool-card-title">
                      <tool.icon className="h-5 w-5" style={{ color: 'var(--accent-pink)' }} />
                      <span>{tool.label}</span>
                    </div>
                    <p className="video-tool-card-desc">{tool.description}</p>
                  </div>
                </Link>
              ))}
            </div>

            <VideoHubSeoBlock />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
