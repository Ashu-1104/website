import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';
import { aiAppsTools, getAIAppsToolBySlug } from '@/data/aiAppsTools';
import FaceSwapSEOContent from '@/components/ai-apps/seo/FaceSwapSEOContent';
import BackgroundRemoverSEOContent from '@/components/ai-apps/seo/BackgroundRemoverSEOContent';
import BackgroundChangerSEOContent from '@/components/ai-apps/seo/BackgroundChangerSEOContent';
import DeepfakeSEOContent from '@/components/ai-apps/seo/DeepfakeSEOContent';
import AIEraserSEOContent from '@/components/ai-apps/seo/AIEraserSEOContent';
import AIImageUpscaleSEOContent from '@/components/ai-apps/seo/AIImageUpscaleSEOContent';
import NSFWComicSEOContent from '@/components/ai-apps/seo/NSFWComicSEOContent';
import AIFiltersSEOContent from '@/components/ai-apps/seo/AIFiltersSEOContent';
import AIAvatarSEOContent from '@/components/ai-apps/seo/AIAvatarSEOContent';
import MangaColoringSEOContent from '@/components/ai-apps/seo/MangaColoringSEOContent';
import AITogetherSEOContent from '@/components/ai-apps/seo/AITogetherSEOContent';
import AIKissingVideoSEOContent from '@/components/ai-apps/seo/AIKissingVideoSEOContent';
import AIStripeSEOContent from '@/components/ai-apps/seo/AIStripeSEOContent';
import SketchToImageSEOContent from '@/components/ai-apps/seo/SketchToImageSEOContent';
import ClothSwapSEOContent from '@/components/ai-apps/seo/ClothSwapSEOContent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

// Per-tool SEO metadata — title, description, and keywords tuned for Google ranking
const TOOL_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  'background-remover': {
    title: 'AI Background Remover — Remove Background from Image Free | Veloura.ai',
    description: 'Remove backgrounds from any image instantly with AI. Free online background remover — no sign-up required. Perfect for portraits, product photos, and more.',
    keywords: ['AI background remover free', 'remove background from image', 'background remover online', 'remove image background AI', 'free background remover'],
  },
  'background-changer': {
    title: 'AI Background Changer — Replace Image Background with AI | Veloura.ai',
    description: 'Replace any image background with AI-generated scenes using text prompts. Free AI background changer online — no watermarks.',
    keywords: ['AI background changer', 'replace image background AI', 'change background online', 'AI background generator', 'background replacement tool'],
  },
  'face-swap': {
    title: 'AI Face Swap — Free Face Swap Online in Seconds | Veloura.ai',
    description: 'Swap faces between photos instantly with AI. The best free face swap tool online — realistic results, no watermark. Try face swap AI now.',
    keywords: ['face swap AI free', 'AI face swap online', 'free face swap tool', 'face swap photo', 'face swap app online', 'best face swap AI'],
  },
  'deepfake-videos': {
    title: 'AI Deepfake Video Maker — Face Swap Videos Online Free | Veloura.ai',
    description: 'Create deepfake videos with AI face swap technology. Free deepfake video maker online — swap faces in videos realistically in seconds.',
    keywords: ['deepfake video maker', 'AI deepfake maker free', 'deepfake video online', 'AI video face swap', 'face swap video tool', 'deepfake generator'],
  },
  'ai-eraser': {
    title: 'AI Object Eraser — Remove Objects from Photos Free | Veloura.ai',
    description: 'Remove unwanted objects, people, or backgrounds from photos using AI. Free AI eraser tool — clean results with one click.',
    keywords: ['AI eraser', 'remove objects from photo AI', 'AI object remover free', 'erase objects from image', 'photo object remover online'],
  },
  'ai-image-upscale': {
    title: 'AI Image Upscaler — Upscale Image 4x Free Online | Veloura.ai',
    description: 'Upscale and enhance images up to 4x with AI — no quality loss. Free AI image upscaler online. Perfect for low-res photos, artwork, and AI-generated images.',
    keywords: ['AI image upscaler', 'upscale image AI free', 'image upscaler online', 'AI photo enhancer', 'upscale image 4x', 'image quality enhancer AI'],
  },
  'inpainting': {
    title: 'AI Inpainting — Edit & Fill Image Areas with AI | Veloura.ai',
    description: 'Edit specific areas of your image with AI inpainting. Mask and fill regions using text prompts — free AI inpainting tool online.',
    keywords: ['AI inpainting', 'image inpainting online', 'AI image editing', 'fill image with AI', 'generative fill online', 'AI photo editing tool'],
  },
  'nsfw-comic-book-reference-image': {
    title: 'NSFW AI Comic Book Generator — Create Adult Comic Art | Veloura.ai',
    description: 'Generate NSFW comic-style artwork from reference images with AI. Adult AI art generator — uncensored, high quality comic book style.',
    keywords: ['NSFW AI art generator', 'AI comic book generator', 'adult AI image generator', 'uncensored AI art', 'NSFW comic art AI'],
  },
  'ai-filters': {
    title: 'AI Filters — Apply AI Photo Filters & Effects Online Free | Veloura.ai',
    description: 'Apply stunning AI-powered filters and effects to your photos online. Free AI photo filters — transform images in seconds.',
    keywords: ['AI filters online', 'AI photo filters', 'AI image effects', 'photo filter AI free', 'AI image transformation', 'AI style filters'],
  },
  'ai-avatar-generator': {
    title: 'AI Avatar Generator — Create AI Profile Pictures Free | Veloura.ai',
    description: 'Generate stunning AI avatars and headshots from your photos. Free AI avatar generator — create custom AI profile pictures with any style.',
    keywords: ['AI avatar generator', 'AI profile picture generator', 'AI headshot generator', 'create AI avatar free', 'AI profile picture maker', 'custom AI avatar'],
  },
  'manga-coloring': {
    title: 'AI Manga Colorizer — Color Black & White Manga Online Free | Veloura.ai',
    description: 'Colorize black and white manga pages with AI. Free online manga colorizer — vivid, accurate colors applied in seconds.',
    keywords: ['AI manga colorizer', 'manga coloring online', 'colorize manga AI', 'black and white manga to color', 'AI manga coloring tool'],
  },
  'ai-together': {
    title: 'AI Together — Combine Two People in One Photo | Veloura.ai',
    description: 'Merge two people into the same scene with AI. Create realistic combined photos from separate images — free AI photo merge tool.',
    keywords: ['AI photo merge', 'combine people in photo AI', 'AI together photo', 'merge photos AI', 'put people together AI photo'],
  },
  'ai-kissing-video-creator': {
    title: 'AI Kissing Video Creator — Generate Romantic AI Videos | Veloura.ai',
    description: 'Create romantic kissing videos from two photos using AI. Generate realistic AI kissing videos — free online video creator.',
    keywords: ['AI kissing video', 'AI kissing video creator', 'create kissing video AI', 'romantic AI video generator', 'AI video from photos'],
  },
  'ai-stripe': {
    title: 'AI Stripe Video Generator — Create Stripe Effect Videos | Veloura.ai',
    description: 'Generate stunning stripe effect videos from images using AI. Free AI video generator — create cinematic stripe animations online.',
    keywords: ['AI stripe video', 'stripe effect video AI', 'AI video generator', 'image to video AI', 'AI animation generator'],
  },
  'sketch-to-image': {
    title: 'Sketch to Image AI — Convert Drawings to Realistic Images | Veloura.ai',
    description: 'Transform sketches and drawings into realistic AI-generated images. Free sketch to image converter — turn your art into photorealistic results.',
    keywords: ['sketch to image AI', 'drawing to image AI', 'convert sketch to photo AI', 'sketch to realistic image', 'AI image from sketch', 'AI drawing converter'],
  },
  'cloth-swap': {
    title: 'AI Cloth Swap — Swap Outfits on Any Photo Free | Veloura.ai',
    description: 'Swap clothing and outfits on any person using AI. Free cloth swap tool — upload a person and a clothing reference and let AI do the rest.',
    keywords: ['AI cloth swap', 'outfit swap AI', 'clothing swap AI free', 'virtual try-on AI', 'AI dress changer', 'swap clothes in photo AI'],
  },
};

export async function generateMetadata(
  { params }: { params: { app: string } }
): Promise<Metadata> {
  const tool = getAIAppsToolBySlug(params.app);
  if (!tool) return {};

  const seo = TOOL_SEO[params.app];
  const title = seo?.title ?? `${tool.label} — Free AI Tool | Veloura.ai`;
  const description = seo?.description ?? tool.description;
  const keywords = seo?.keywords ?? [];
  const canonical = `${APP_URL}/ai-apps/${params.app}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Veloura.ai',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const PlaygroundLoading = () => (
  <div className="mt-6 flex min-h-[300px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

const BackgroundRemoverPlayground = dynamic(() => import('@/components/ai-apps/BackgroundRemoverPlayground'), { loading: PlaygroundLoading, ssr: false });
const BackgroundChangerPlayground = dynamic(() => import('@/components/ai-apps/BackgroundChangerPlayground'), { loading: PlaygroundLoading, ssr: false });
const AIEraserPlayground = dynamic(() => import('@/components/ai-apps/AIEraserPlayground'), { loading: PlaygroundLoading, ssr: false });
const AIImageUpscalePlayground = dynamic(() => import('@/components/ai-apps/AIImageUpscalePlayground'), { loading: PlaygroundLoading, ssr: false });
const FaceSwapPlayground = dynamic(() => import('@/components/ai-apps/FaceSwapPlayground'), { loading: PlaygroundLoading, ssr: false });
const DeepfakePlayground = dynamic(() => import('@/components/ai-apps/DeepfakePlayground'), { loading: PlaygroundLoading, ssr: false });
const MangaColoringPlayground = dynamic(() => import('@/components/ai-apps/MangaColoringPlayground'), { loading: PlaygroundLoading, ssr: false });
const AITogetherPlayground = dynamic(() => import('@/components/ai-apps/AITogetherPlayground'), { loading: PlaygroundLoading, ssr: false });
const AIKissingVideoPlayground = dynamic(() => import('@/components/ai-apps/AIKissingVideoPlayground'), { loading: PlaygroundLoading, ssr: false });
const AIStripePlayground = dynamic(() => import('@/components/ai-apps/AIStripePlayground'), { loading: PlaygroundLoading, ssr: false });
const AIFiltersPlayground = dynamic(() => import('@/components/ai-apps/AIFiltersPlayground'), { loading: PlaygroundLoading, ssr: false });
const AIAvatarPlayground = dynamic(() => import('@/components/ai-apps/AIAvatarPlayground'), { loading: PlaygroundLoading, ssr: false });
const SketchToImagePlayground = dynamic(() => import('@/components/ai-apps/SketchToImagePlayground'), { loading: PlaygroundLoading, ssr: false });
const ClothSwapPlayground = dynamic(() => import('@/components/ai-apps/ClothSwapPlayground'), { loading: PlaygroundLoading, ssr: false });

export const dynamicParams = false;

export function generateStaticParams() {
  return aiAppsTools.map((tool) => ({ app: tool.slug }));
}

function getPlaygroundComponent(slug: string) {
  switch (slug) {
    case 'background-remover':
      return <BackgroundRemoverPlayground />;
    case 'background-changer':
      return <BackgroundChangerPlayground />;
    case 'ai-eraser':
      return <AIEraserPlayground />;
    case 'ai-image-upscale':
      return <AIImageUpscalePlayground />;
    case 'face-swap':
      return <FaceSwapPlayground />;
    case 'deepfake-videos':
      return <DeepfakePlayground />;
    case 'inpainting':
      redirect('/edit-image');
    case 'manga-coloring':
      return <MangaColoringPlayground />;
    case 'ai-together':
      return <AITogetherPlayground />;
    case 'ai-kissing-video-creator':
      return <AIKissingVideoPlayground />;
    case 'ai-stripe':
      return <AIStripePlayground />;
    case 'ai-filters':
      return <AIFiltersPlayground />;
    case 'ai-avatar-generator':
      return <AIAvatarPlayground />;
    case 'sketch-to-image':
      return <SketchToImagePlayground />;
    case 'cloth-swap':
      return <ClothSwapPlayground />;
    default:
      return <p className="mt-2 text-text-secondary">Playground coming soon.</p>;
  }
}

export default function AIAppPage({ params }: { params: { app: string } }) {
  const tool = getAIAppsToolBySlug(params.app);
  if (!tool) notFound();

  return (
    <>
      <div className="content-wrapper">
        <div className="flex items-center gap-4">
          <Link
            href="/ai-apps"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>AI Apps</span>
          </Link>
          <h1 className="page-title">{tool.label}</h1>
        </div>
        {getPlaygroundComponent(params.app)}

        {/* SEO content — shown below the playground, unique per tool */}
        {params.app === 'face-swap' && <FaceSwapSEOContent />}
        {params.app === 'background-remover' && <BackgroundRemoverSEOContent />}
        {params.app === 'background-changer' && <BackgroundChangerSEOContent />}
        {params.app === 'deepfake-videos' && <DeepfakeSEOContent />}
        {params.app === 'ai-eraser' && <AIEraserSEOContent />}
        {params.app === 'ai-image-upscale' && <AIImageUpscaleSEOContent />}
        {params.app === 'nsfw-comic-book-reference-image' && <NSFWComicSEOContent />}
        {params.app === 'ai-filters' && <AIFiltersSEOContent />}
        {params.app === 'ai-avatar-generator' && <AIAvatarSEOContent />}
        {params.app === 'manga-coloring' && <MangaColoringSEOContent />}
        {params.app === 'ai-together' && <AITogetherSEOContent />}
        {params.app === 'ai-kissing-video-creator' && <AIKissingVideoSEOContent />}
        {params.app === 'ai-stripe' && <AIStripeSEOContent />}
        {params.app === 'sketch-to-image' && <SketchToImageSEOContent />}
        {params.app === 'cloth-swap' && <ClothSwapSEOContent />}
      </div>
      <Footer />
    </>
  );
}
