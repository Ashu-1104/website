import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

function withBaseUrl(baseUrl: string, key?: string | null) {
  if (!key) return null;
  if (ABSOLUTE_URL_REGEX.test(key)) return key;
  if (!baseUrl) return null;
  return `${baseUrl}/${key}`;
}

export async function GET() {
  try {
    const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');
    const videos = await prisma.sidebarLogoVideo.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({
      videos: videos.map((video) => ({
        id: video.id,
        videoUrl: withBaseUrl(mediaBaseUrl, video.videoUrl) ?? video.videoUrl,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load logo videos';
    return NextResponse.json({ videos: [], error: message }, { status: 500 });
  }
}
