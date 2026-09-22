import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/user/media/[id]
 *
 * Get a single media item.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid media ID format.' }, { status: 400 });
  }

  const media = await prisma.userMedia.findUnique({
    where: { id },
    include: {
      asset: true,
      job: true,
    },
  });

  if (!media) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }

  // Check visibility
  if (media.visibility === 'PRIVATE' && media.userId !== userId) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }

  return NextResponse.json({
    media: {
      id: media.id,
      title: media.title,
      prompt: media.prompt,
      visibility: media.visibility,
      isPostedToCommunity: media.isPostedToCommunity,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      isOwner: media.userId === userId,
      asset: {
        id: media.asset.id,
        type: media.asset.type,
        url: media.asset.r2Key,
        width: media.asset.width,
        height: media.asset.height,
        durationSeconds: media.asset.durationSeconds,
        posterUrl: media.asset.posterKey,
        previewUrl: media.asset.previewKey,
      },
      job: media.job
        ? {
            id: media.job.id,
            type: media.job.jobType,
            status: media.job.status,
            requestData: media.job.requestData,
          }
        : null,
    },
  });
}

/**
 * PUT /api/user/media/[id]
 *
 * Update a media item (title, visibility, etc.).
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid media ID format.' }, { status: 400 });
  }

  const media = await prisma.userMedia.findUnique({ where: { id } });

  if (!media) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }

  if (media.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only update your own media.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) {
    updateData.title = typeof body.title === 'string' ? body.title : null;
  }

  if (body.prompt !== undefined) {
    updateData.prompt = typeof body.prompt === 'string' ? body.prompt : null;
  }

  const validVisibilities = ['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY'];
  if (validVisibilities.includes(body.visibility as string)) {
    updateData.visibility = body.visibility;
  }

  if (typeof body.isPostedToCommunity === 'boolean') {
    updateData.isPostedToCommunity = body.isPostedToCommunity;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const updated = await prisma.userMedia.update({
    where: { id },
    data: updateData,
    include: { asset: true },
  });

  return NextResponse.json({
    media: {
      id: updated.id,
      title: updated.title,
      prompt: updated.prompt,
      visibility: updated.visibility,
      isPostedToCommunity: updated.isPostedToCommunity,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      asset: {
        id: updated.asset.id,
        type: updated.asset.type,
        url: updated.asset.r2Key,
      },
    },
  });
}

/**
 * DELETE /api/user/media/[id]
 *
 * Delete a media item from user's gallery.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid media ID format.' }, { status: 400 });
  }

  const media = await prisma.userMedia.findUnique({ where: { id } });

  if (!media) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }

  if (media.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only delete your own media.' },
      { status: 403 }
    );
  }

  await prisma.userMedia.delete({ where: { id } });

  return NextResponse.json({ message: 'Media deleted successfully.', id });
}
