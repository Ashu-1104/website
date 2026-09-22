import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ModelDetailPage from '@/components/models/ModelDetailPage';
import { SidebarProvider } from '@/context/SidebarContext';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 3600; // ISR: revalidate every hour

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.veloura.ai';

const UUID_REGEX_META =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MODEL_TYPE_LABELS: Record<string, string> = {
  CHECKPOINT: 'Checkpoint',
  LORA: 'LoRA',
  EMBEDDING: 'Embedding',
  VAE: 'VAE',
};

const BASE_MODEL_LABELS: Record<string, string> = {
  SD_1_5: 'SD 1.5',
  SDXL: 'SDXL',
  FLUX: 'Flux',
  PONY: 'Pony',
  ILLUSTRIOUS: 'Illustrious',
};

export async function generateMetadata(
  { params }: { params: { modelId: string } }
): Promise<Metadata> {
  const idOrSlug = params.modelId?.trim();
  if (!idOrSlug) return {};

  const model = await prisma.userUploadedModel.findFirst({
    where: UUID_REGEX_META.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    select: {
      name: true,
      description: true,
      slug: true,
      modelType: true,
      baseModel: true,
      isNsfw: true,
      seoTitle: true,
      seoDescription: true,
      tags: true,
      thumbnails: { take: 1, orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!model) return {};

  const slug = model.slug ?? idOrSlug;
  const canonical = `${APP_URL}/models/${slug}`;

  const niceType = MODEL_TYPE_LABELS[model.modelType] ?? model.modelType;
  const niceBase = BASE_MODEL_LABELS[model.baseModel] ?? model.baseModel;
  const nsfwTag = model.isNsfw ? ' (NSFW)' : '';

  // Title: custom seoTitle > smart auto-generated
  const title = model.seoTitle
    ?? `${model.name} — ${niceType} for ${niceBase}${nsfwTag} | Veloura.ai`;

  // Description: custom seoDescription > structured auto > generic fallback
  const description = model.seoDescription
    ?? (model.description
      ? `${model.description.split('.')[0].slice(0, 140)}. Free ${niceType} on Veloura.ai — NSFW supported, no watermark.`
      : `Use the ${model.name} ${niceType} on Veloura.ai for AI image generation with ${niceBase}. Free, NSFW supported, no watermark.`);

  // Keywords: custom tags + dynamic additions
  const baseTags = model.tags
    ? model.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const keywords = [
    ...baseTags,
    model.name,
    `${model.name} ${niceType.toLowerCase()}`,
    `${model.name} ${niceBase}`,
    `${niceType.toLowerCase()} model`,
    `${niceBase} ${niceType.toLowerCase()}`,
    'stable diffusion model',
    'AI image generation model',
    ...(model.isNsfw ? ['NSFW AI model', 'uncensored AI model'] : []),
    'Veloura.ai',
  ];

  const ogImage = model.thumbnails[0]?.imageUrl;

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
      ...(ogImage ? { images: [{ url: ogImage, width: 512, height: 512, alt: model.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

const UUID_REGEX = UUID_REGEX_META;

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default async function ModelPage({ params }: { params: { modelId: string } }) {
  const idOrSlug = params.modelId?.trim();
  if (!idOrSlug) notFound();

  let model;

  const includeOpts = {
    user: {
      select: {
        id: true,
        handle: true,
        avatarUrl: true,
        bannerUrl: true,
        avatarDecoration: true,
        avatarDecorationUrl: true,
      },
    },
    thumbnails: {
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  if (UUID_REGEX.test(idOrSlug)) {
    model = await prisma.userUploadedModel.findUnique({
      where: { id: idOrSlug },
      include: includeOpts,
    });
  } else {
    // Try exact slug first, then normalized slug as fallback
    model = await prisma.userUploadedModel.findUnique({
      where: { slug: idOrSlug },
      include: includeOpts,
    });
    if (!model) {
      const normalized = slugify(idOrSlug);
      if (normalized && normalized !== idOrSlug) {
        model = await prisma.userUploadedModel.findUnique({
          where: { slug: normalized },
          include: includeOpts,
        });
      }
    }
  }

  if (!model) notFound();

  // Fetch all versions in this model group
  const rootId = model.parentModelId ?? model.id;
  const allVersions = await prisma.userUploadedModel.findMany({
    where: {
      OR: [{ id: rootId }, { parentModelId: rootId }],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      version: true,
      baseModel: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });

  const versions = allVersions.length > 1
    ? allVersions.map((v) => ({
        id: v.id,
        slug: v.slug,
        version: v.version,
        baseModel: v.baseModel,
        thumbnailUrl: v.thumbnailUrl,
        createdAt: v.createdAt.toISOString(),
        isCurrent: v.id === model.id,
      }))
    : undefined;

  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="content-wrapper">
            <ModelDetailPage
              model={{
                id: model.id,
                name: model.name,
                description: model.description,
                modelType: model.modelType,
                baseModel: model.baseModel,
                badge: model.badge,
                thumbnailUrl: model.thumbnailUrl,
                downloadUrl: model.downloadUrl,
                fileSize: model.fileSize ? Number(model.fileSize) : null,
                triggerWord: model.triggerWord,
                usageTips: model.usageTips,
                trainingSteps: model.trainingSteps,
                trainingEpochs: model.trainingEpochs,
                downloads: model.downloads,
                likeCount: model.likeCount,
                favoriteCount: model.favoriteCount,
                usageCount: model.usageCount,
                isNsfw: model.isNsfw,
                createdAt: model.createdAt.toISOString(),
                creator: {
                  id: model.user.id,
                  handle: model.user.handle,
                  avatarUrl: model.user.avatarUrl,
                  bannerUrl: model.user.bannerUrl,
                  avatarDecoration: model.user.avatarDecoration ?? null,
                  avatarDecorationUrl: model.user.avatarDecorationUrl ?? null,
                },
                thumbnails: model.thumbnails.map((t) => ({
                  id: t.id,
                  imageUrl: t.imageUrl,
                  sortOrder: t.sortOrder,
                })),
              }}
              versions={versions}
            />
          </div>
          <Footer />
        </main>
      </div>
    </SidebarProvider>
  );
}
