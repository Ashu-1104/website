export const dynamic = 'force-static';
export const revalidate = 86400;

import Link from 'next/link';
import Footer from '@/components/Footer';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const BREADCRUMB = [
  { name: 'Home', url: APP_URL },
  { name: 'AI Apps', url: `${APP_URL}/ai-apps` },
  { name: 'AI Image Editor', url: `${APP_URL}/ai-image-editor` },
];

const FAQ_ITEMS = [
  { q: 'What is an AI image editor?', a: 'An AI image editor is a tool that uses artificial intelligence to automatically edit photos — removing objects, changing backgrounds, swapping faces, upscaling resolution, and more — without requiring design skills or complex software like Photoshop.' },
  { q: 'How is AI image editing different from AI image generation?', a: 'AI image generation creates new images from scratch using a text prompt. AI image editing modifies an existing image — erasing parts, replacing backgrounds, enhancing resolution, or applying style transformations. Veloura.ai offers both capabilities.' },
  { q: 'Is the AI image editor free?', a: 'Yes, the AI image editor tools are free to use on Veloura.ai. Premium plans unlock higher resolution outputs, batch processing, and faster processing speeds.' },
  { q: 'What can I edit with the AI image editor?', a: 'You can remove unwanted objects or people, change or replace backgrounds, swap faces, upscale image resolution up to 4x, apply AI style filters, colorize manga, remove clothing in AI-generated images, and use generative fill to replace any masked area with AI-generated content.' },
  { q: 'Does the AI image editor work on NSFW images?', a: 'Yes. Veloura.ai has no content restrictions. The AI image editor works on any image including NSFW and adult content, making it uniquely powerful for AI character and virtual partner image editing.' },
  { q: 'Do I need design skills to use it?', a: 'No. All AI image editing tools on Veloura.ai are fully automated — upload your image, select the edit type, and the AI does the rest. No Photoshop, no manual selection, no technical skills needed.' },
];

const EDITING_TOOLS = [
  { title: 'Object & Person Removal', desc: 'Erase unwanted objects, people, or backgrounds from any photo. AI intelligently fills the removed area using the surrounding image.', href: '/ai-apps/ai-eraser', label: 'Try AI Eraser' },
  { title: 'Background Changer', desc: 'Replace any image background with an AI-generated scene using a text prompt. From studio to fantasy setting — instant results.', href: '/ai-apps/background-changer', label: 'Try Background Changer' },
  { title: 'Background Remover', desc: 'Remove image backgrounds in one click and export as a transparent PNG. Perfect for AI character images and product photos.', href: '/ai-apps/background-remover', label: 'Try Background Remover' },
  { title: 'AI Face Swap', desc: 'Swap faces between any two photos with photorealistic accuracy. Matches skin tone, lighting, and facial angles automatically.', href: '/ai-apps/face-swap', label: 'Try Face Swap' },
  { title: 'AI Image Upscaler', desc: 'Enlarge and enhance any image up to 4x without quality loss. Sharpens edges, recovers detail, and removes compression artifacts.', href: '/ai-apps/ai-image-upscale', label: 'Try Upscaler' },
  { title: 'Generative Fill / Inpainting', desc: 'Mask any area of an image and replace it with AI-generated content using a text prompt. The most powerful image editing tool available.', href: '/edit-image', label: 'Try Inpainting' },
  { title: 'AI Filters & Style Transfer', desc: 'Re-render any photo in a new artistic style — anime, oil painting, cyberpunk, and more. Full image transformation in seconds.', href: '/ai-apps/ai-filters', label: 'Try AI Filters' },
  { title: 'Cloth Swap', desc: 'Virtually swap outfits on any person using AI. Upload a person photo and a clothing reference — the AI transfers it naturally.', href: '/ai-apps/cloth-swap', label: 'Try Cloth Swap' },
];

export default function AIImageEditorPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* Hero */}
      <div className="mt-6 mb-14">
        <h1 className="page-title">AI Image Editor</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
          Edit any photo with AI — no Photoshop, no design skills needed. Remove objects,
          change backgrounds, swap faces, upscale resolution, apply style filters, and more.
          Free AI image editing tools with instant results and no watermark.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/edit-image"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Open AI Image Editor
          </Link>
          <Link
            href="/ai-apps"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse All AI Tools
          </Link>
        </div>
      </div>

      {/* What is */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is an AI Image Editor?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          An AI image editor uses artificial intelligence to automatically modify existing
          photos — removing objects, replacing backgrounds, enhancing resolution, and
          applying style transformations — without any design expertise. Unlike traditional
          tools like Photoshop that require manual selection and layer editing, AI image
          editors analyse the image intelligently and make complex edits in seconds with
          a single click or prompt.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          Veloura.ai is the only platform that combines a full AI image editor with
          AI companion chat, image generation, and video creation in one place — giving you
          complete creative control over your AI girlfriend or virtual partner images with no
          restrictions whatsoever.
        </p>
      </div>

      {/* Tools grid */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">AI Image Editing Tools</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          15+ AI image editing tools — all free, all instant, all with no content filters.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {EDITING_TOOLS.map(({ title, desc, href, label }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
              <Link
                href={href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#ff3e8a] hover:underline"
              >
                {label} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Generation vs Editing explainer */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">AI Image Generation vs. AI Image Editing</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          These are two distinct capabilities — and Veloura.ai is one of the only
          platforms that offers both:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
            <h3 className="text-base font-semibold text-white">AI Image Generation</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Creates brand new images from scratch using a text prompt. You describe what
              you want — your AI girlfriend&apos;s appearance, setting, style — and the AI
              generates it. Best for creating original AI character images.
            </p>
            <Link href="/create" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#ff3e8a] hover:underline">
              Try AI Image Generator →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
            <h3 className="text-base font-semibold text-white">AI Image Editing</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Modifies an existing image — removing objects, changing backgrounds, swapping
              faces, enhancing resolution, applying styles. Best for refining and perfecting
              images you have already generated.
            </p>
            <Link href="/ai-apps" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#ff3e8a] hover:underline">
              Try AI Image Editor →
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/10 bg-[#12121a]">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-white select-none marker:hidden">
                {q}
                <span className="ml-4 shrink-0 text-[#ff3e8a] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/50">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Related Features */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">Explore Related AI Tools</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'AI Image Generator', desc: 'Generate AI images from text prompts. Create your AI girlfriend or character from scratch.', href: '/create' },
            { title: 'AI Video Generator', desc: 'Create deepfake videos, AI kissing videos, and motion transfer animations with AI.', href: '/ai-video-generator' },
            { title: 'All AI Apps', desc: 'Browse 15+ AI image and video tools — face swap, background remover, upscaler, and more.', href: '/ai-apps' },
          ].map(({ title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-white/10 bg-[#12121a] p-5 transition-colors hover:border-[#ff3e8a]/40"
            >
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
