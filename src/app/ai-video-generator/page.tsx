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
  { name: 'AI Video Generator', url: `${APP_URL}/ai-video-generator` },
];

const FAQ_ITEMS = [
  { q: 'Is the AI video generator free?', a: 'Yes, AI video generation is free to start on Veloura.ai. Free accounts can generate short videos. Premium plans unlock longer videos, higher resolution, and faster processing.' },
  { q: 'What types of AI videos can I create?', a: 'You can create deepfake face swap videos, AI kissing videos from two photos, motion transfer dance videos, AI stripe reveal animations, and image-to-video conversions. Multiple video generation tools are available.' },
  { q: 'Do I need video editing skills?', a: 'No. All AI video tools are fully automated — upload your photos or prompts, and the AI generates the video. No editing software, no technical knowledge required.' },
  { q: 'Can I generate NSFW AI videos?', a: 'Yes. Veloura.ai has no content restrictions. NSFW and adult AI video generation is fully supported, making it unique among AI video platforms.' },
  { q: 'How long does AI video generation take?', a: 'Most AI video generations complete within 1–5 minutes depending on the tool and video length. Premium plans get priority processing for faster results.' },
  { q: 'Can I generate videos of my AI girlfriend or character?', a: 'Yes. Use your AI character images with the video generation tools to create videos featuring your virtual partner — face swap, motion transfer, or kissing video generator all work with your custom AI characters.' },
];

const VIDEO_TOOLS = [
  { title: 'Deepfake Video Maker', desc: 'Swap faces in any video with photorealistic accuracy. Upload a face photo and a target video — the AI replaces the face frame by frame.', href: '/ai-apps/deepfake-videos', label: 'Try Deepfake Maker' },
  { title: 'AI Kissing Video Creator', desc: 'Generate romantic kissing videos from two face photos. AI synthesises a realistic video of two people in an intimate scene.', href: '/ai-apps/ai-kissing-video-creator', label: 'Try Kissing Video' },
  { title: 'AI Stripe Video Generator', desc: 'Animate any image with a cinematic stripe reveal effect. Perfect for social media content and AI character reveals.', href: '/ai-apps/ai-stripe', label: 'Try Stripe Video' },
  { title: 'Motion Transfer', desc: 'Transfer motion and dance moves from a reference video onto your AI character. Bring your virtual partner to life with realistic movement.', href: '/create/video/motion-transfer', label: 'Try Motion Transfer' },
  { title: 'AI Video Generator', desc: 'Generate videos from text prompts or reference images. Create original AI video content without filming anything.', href: '/create/video/generator', label: 'Try Video Generator' },
];

export default function AIVideoGeneratorPage() {
  return (
    <div className="content-wrapper">
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={BREADCRUMB} />

      {/* Hero */}
      <div className="mt-6 mb-14">
        <h1 className="page-title">AI Video Generator</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
          Create AI-generated videos online — free, no editing skills required. Generate
          deepfake videos, AI kissing videos, motion transfer animations, and more. NSFW
          content fully supported, instant results, no watermark.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/create/video"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ff3e8a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3e8a]/90"
          >
            Open AI Video Tools
          </Link>
          <Link
            href="/ai-apps"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse All AI Apps
          </Link>
        </div>
      </div>

      {/* What is */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What is an AI Video Generator?</h2>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/60">
          An AI video generator creates video content automatically using artificial
          intelligence — no camera, no filming, no editing expertise required. AI video
          tools can synthesise faces into existing videos (deepfake), animate still images
          into motion, generate video from text prompts, or create entirely new scenes from
          photo inputs.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
          Veloura.ai offers multiple AI video generation tools with zero content
          restrictions — making it the most capable AI video platform for creating content
          featuring your AI girlfriend or virtual partner. No other competitor has a
          dedicated AI video generator page.
        </p>
      </div>

      {/* Tools */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">AI Video Generation Tools</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEO_TOOLS.map(({ title, desc, href, label }) => (
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

      {/* Use cases */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">What Can You Create with AI Video Generator?</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Create deepfake videos swapping faces with photorealistic accuracy',
            'Generate AI kissing videos from two photos — no filming required',
            'Bring your AI girlfriend or virtual partner to life with motion transfer',
            'Produce NSFW AI videos featuring your custom AI characters',
            'Create viral social media content with AI stripe reveal animations',
            'Generate AI video from your custom LoRA character model',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#12121a] px-4 py-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#ff3e8a]" />
              <span className="text-sm text-white/60">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white">How to Generate AI Videos</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { step: '01', title: 'Choose Your Video Tool', desc: 'Select from deepfake maker, kissing video creator, motion transfer, stripe video, or AI video generator based on what you want to create.' },
            { step: '02', title: 'Upload Photos or Prompts', desc: 'Upload the face photos, reference videos, or text prompts the AI needs. Most tools need only 1–2 image inputs.' },
            { step: '03', title: 'Download Your Video', desc: 'The AI generates your video in minutes. Download as MP4 — no watermark, ready to share anywhere.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-[#12121a] p-5">
              <span className="text-3xl font-black text-[#ff3e8a]/30">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
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
            { title: 'AI Image Editor', desc: 'Edit any photo with AI — remove objects, swap faces, change backgrounds, and upscale resolution.', href: '/ai-image-editor' },
            { title: 'AI Image Generator', desc: 'Generate AI images from text prompts. Create your AI girlfriend or virtual partner from scratch.', href: '/create' },
            { title: 'All AI Apps', desc: 'Browse 15+ AI image and video tools — face swap, background remover, upscaler, cloth swap, and more.', href: '/ai-apps' },
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
