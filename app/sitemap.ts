export const dynamic = 'force-dynamic';

import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { aiAppsTools } from '@/data/aiAppsTools';
import { aiAudioTools } from '@/data/aiAudioTools';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

function url(path: string): string {
  return `${APP_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: url('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: url('/ai-apps'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: url('/ai-audio'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: url('/models'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: url('/community'),
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: url('/create'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: url('/create/video'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: url('/create/video/generator'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: url('/create/video/motion-transfer'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: url('/create-your-own-ai-character'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: url('/lora-training'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // ── Feature landing pages ─────────────────────────────────────────────────
    { url: url('/ai-girlfriend-chat'),  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/ai-boyfriend'),        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/ai-roleplay'),         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/ai-image-editor'),     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/ai-video-generator'),  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/pricing'),             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    // ── Quick-win landing pages (report: ultra-low KD, high volume) ───────────
    // "free nsfw ai chat"            9,900/mo, KD 21%
    { url: url('/free-nsfw-ai-chat'),              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "uncensored ai generator"      8,100/mo, KD 22%
    { url: url('/uncensored-ai-generator'),        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "uncensored ai video generator" 2,900/mo, KD 10% — ULTRA QUICK WIN
    { url: url('/uncensored-ai-video-generator'),  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "character ai alternative"     4,400/mo, KD 29%
    { url: url('/character-ai-alternative'),       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "ai girlfriend generator"      4,400/mo, KD 35%
    { url: url('/ai-girlfriend-generator'),        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "chatgpt alternative"          27,100/mo, KD 29% — BIGGEST OPPORTUNITY
    { url: url('/chatgpt-alternative'),            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "ai image generator no filter" 1,600/mo, KD 18% — EASIEST TO RANK
    { url: url('/ai-image-generator-no-filter'),        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    // "ai image generator no restrictions" 9,900/mo, KD 38% — HIGH VOLUME
    { url: url('/ai-image-generator-no-restrictions'),  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    // AI Partner Lobby — the product hub (character grid)
    { url: url('/ai-partner-lobby'),               lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    // ── Blog pages ────────────────────────────────────────────────────────────
    { url: url('/blog'),                                      lastModified: new Date(), changeFrequency: 'weekly',   priority: 0.8 },
    { url: url('/blog/best-nsfw-ai-chat'),                    lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.9 },
    { url: url('/blog/best-uncensored-ai'),                   lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.8 },
    { url: url('/blog/character-ai-alternative-no-filter'),   lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.9 },
    { url: url('/blog/how-to-train-a-lora'),                  lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.8 },
    { url: url('/blog/fluxgym-lora-training'),                lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.8 },
    { url: url('/blog/how-to-train-wan-2-2-lora'),            lastModified: new Date(), changeFrequency: 'monthly',  priority: 0.8 },
  ];

  // ── AI Apps tool pages ───────────────────────────────────────────────────────
  // These are your highest SEO opportunity — each tool targets a specific keyword
  const aiAppPages: MetadataRoute.Sitemap = aiAppsTools.map((tool) => ({
    url: url(`/ai-apps/${tool.slug}`),
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  // ── AI Audio tool pages ──────────────────────────────────────────────────────
  const aiAudioPages: MetadataRoute.Sitemap = aiAudioTools.map((tool) => ({
    url: url(`/ai-audio/${tool.slug}`),
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  // ── Model pages (use slug when available, skip UUID-only entries) ────────────
  // Only include active models that have a clean slug for SEO-friendly URLs
  let modelPages: MetadataRoute.Sitemap = [];
  try {
    const models = await prisma.userUploadedModel.findMany({
      where: {
        slug: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 500, // cap at 500 — split into multiple sitemaps if you grow beyond this
    });

    modelPages = models
      .filter((m): m is typeof m & { slug: string } => typeof m.slug === 'string' && m.slug.length > 0)
      .map((model) => ({
        url: url(`/models/${model.slug}`),
        lastModified: model.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    // Non-fatal — sitemap still returns static pages if DB is unavailable
    console.error('[Sitemap] Failed to fetch model pages:', error);
  }

  return [
    ...staticPages,
    ...aiAppPages,
    ...aiAudioPages,
    ...modelPages,
  ];
}
