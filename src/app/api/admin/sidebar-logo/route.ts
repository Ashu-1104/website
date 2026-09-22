import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';
import { DEFAULT_SIDEBAR_LOGO_VIDEOS } from '@/lib/sidebarLogoVideos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  try {
    const existingCount = await prisma.sidebarLogoVideo.count();
    if (existingCount === 0 && DEFAULT_SIDEBAR_LOGO_VIDEOS.length > 0) {
      await prisma.sidebarLogoVideo.createMany({
        data: DEFAULT_SIDEBAR_LOGO_VIDEOS.map((videoUrl) => ({ videoUrl, isActive: true })),
      });
    }

    const items = await prisma.sidebarLogoVideo.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load logo videos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required.' }, { status: 400 });
    }

    const item = await prisma.sidebarLogoVideo.create({
      data: { videoUrl, isActive },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add logo video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : null;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null;

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const data: { videoUrl?: string; isActive?: boolean } = {};
    if (videoUrl !== null) data.videoUrl = videoUrl;
    if (isActive !== null) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const item = await prisma.sidebarLogoVideo.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update logo video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    await prisma.sidebarLogoVideo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove logo video';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
