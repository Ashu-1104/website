import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CursorPayload = { createdAt: string; id: string };

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.createdAt !== 'string') return null;
    if (typeof parsed.id !== 'string') return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

/**
 * GET /api/user/media
 *
 * Get user's media gallery (generated images and videos).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Query params:
 * - type: Filter by media type (IMAGE, VIDEO)
 * - visibility: Filter by visibility (PUBLIC, PRIVATE, FOLLOWERS_ONLY)
 * - limit: Number of items (default: 20, max: 50)
 * - cursor: Pagination cursor
 */
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const visibility = searchParams.get('visibility');
  const cursorRaw = searchParams.get('cursor');
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  const validTypes = ['IMAGE', 'VIDEO'];
  const validVisibilities = ['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY'];

  const where: Record<string, unknown> = { userId };

  if (type && validTypes.includes(type)) {
    where.asset = { type };
  }

  if (visibility && validVisibilities.includes(visibility)) {
    where.visibility = visibility;
  }

  if (cursorPayload) {
    where.OR = [
      { createdAt: { lt: cursorPayload.createdAt } },
      { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
    ];
  }

  const media = await prisma.userMedia.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: {
      asset: true,
      job: {
        select: {
          id: true,
          jobType: true,
          status: true,
          completedAt: true,
        },
      },
    },
  });

  const lastItem = media.at(-1);
  const nextCursor =
    lastItem && media.length === limit
      ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
      : null;

  const items = media.map((m) => ({
    id: m.id,
    title: m.title,
    prompt: m.prompt,
    visibility: m.visibility,
    isPostedToCommunity: m.isPostedToCommunity,
    createdAt: m.createdAt,
    asset: {
      id: m.asset.id,
      type: m.asset.type,
      url: m.asset.r2Key,
      width: m.asset.width,
      height: m.asset.height,
      durationSeconds: m.asset.durationSeconds,
      posterUrl: m.asset.posterKey,
    },
    job: m.job
      ? {
          id: m.job.id,
          type: m.job.jobType,
          status: m.job.status,
          completedAt: m.job.completedAt,
        }
      : null,
  }));

  return NextResponse.json({ items, nextCursor });
}

/**
 * POST /api/user/media
 *
 * Add media to user's gallery (typically after generation completes).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - assetId: UUID of the MediaAsset (required)
 * - jobId: UUID of the GenerationJob (optional)
 * - title: string (optional)
 * - prompt: string (optional)
 * - visibility: PUBLIC | PRIVATE | FOLLOWERS_ONLY (default: PRIVATE)
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const assetId = body.assetId as string;
  if (!assetId || !UUID_REGEX.test(assetId)) {
    return NextResponse.json({ error: 'Valid assetId is required.' }, { status: 400 });
  }

  // Verify asset exists
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }

  const jobId = body.jobId as string | undefined;
  const title = typeof body.title === 'string' ? body.title : null;
  const prompt = typeof body.prompt === 'string' ? body.prompt : null;

  const validVisibilities = ['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY'];
  const visibility = validVisibilities.includes(body.visibility as string)
    ? (body.visibility as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY')
    : 'PRIVATE';

  const userMedia = await prisma.userMedia.create({
    data: {
      userId,
      assetId,
      jobId: jobId && UUID_REGEX.test(jobId) ? jobId : undefined,
      title,
      prompt,
      visibility,
    },
    include: {
      asset: true,
    },
  });

  return NextResponse.json(
    {
      media: {
        id: userMedia.id,
        title: userMedia.title,
        prompt: userMedia.prompt,
        visibility: userMedia.visibility,
        createdAt: userMedia.createdAt,
        asset: {
          id: userMedia.asset.id,
          type: userMedia.asset.type,
          url: userMedia.asset.r2Key,
          width: userMedia.asset.width,
          height: userMedia.asset.height,
        },
      },
    },
    { status: 201 }
  );
}
