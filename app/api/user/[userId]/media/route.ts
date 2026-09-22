import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ProfileVisibility, UserMediaVisibility, MediaType } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
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

function parseLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function buildMediaUrl(baseUrl: string, key?: string | null) {
  if (!key) return null;
  if (ABSOLUTE_URL_REGEX.test(key)) return key;
  if (!baseUrl) return null;
  return `${baseUrl}/${key}`;
}

function canViewProfileContent(opts: {
  isSelf: boolean;
  visibility: ProfileVisibility;
  followStatus: 'none' | 'pending' | 'following';
  isFollowedBy: boolean;
}) {
  const { isSelf, visibility, followStatus, isFollowedBy } = opts;
  if (isSelf || visibility === 'PUBLIC') return true;
  if (visibility === 'PRIVATE') return followStatus === 'following';
  if (visibility === 'FRIENDS_ONLY') return followStatus === 'following' && isFollowedBy;
  return false;
}

function mediaVisibilityForViewer(opts: {
  isSelf: boolean;
  followStatus: 'none' | 'pending' | 'following';
}): UserMediaVisibility[] | null {
  if (opts.isSelf) return null;
  return opts.followStatus === 'following' ? ['PUBLIC', 'FOLLOWERS_ONLY'] : ['PUBLIC'];
}

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const targetUserId = params.userId;
  const currentUserId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const rawType = searchParams.get('type');
  const cursorRaw = searchParams.get('cursor');
  const limit = parseLimit(searchParams.get('limit'));
  const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? '').replace(/\/+$/, '');

  const type: MediaType | null =
    rawType === 'IMAGE' || rawType === 'VIDEO' ? (rawType as MediaType) : null;

  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        handle: true,
        isDeactivated: true,
        profileVisibility: true,
      },
    });

    if (!targetUser || targetUser.isDeactivated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValidCurrentUserId = UUID_REGEX.test(currentUserId);
    const isSelf = isValidCurrentUserId && currentUserId === targetUserId;

    // Block checks (either direction)
    if (isValidCurrentUserId && !isSelf) {
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: targetUserId, blockedId: currentUserId },
            { blockerId: currentUserId, blockedId: targetUserId },
          ],
        },
      });

      if (block) {
        const isBlockedByTarget = block.blockerId === targetUserId;
        return NextResponse.json(
          {
            blocked: true,
            message: isBlockedByTarget ? "You're blocked" : "You blocked this user",
          },
          { status: 403 }
        );
      }
    }

    let followStatus: 'none' | 'pending' | 'following' = 'none';
    let isFollowedBy = false;

    if (isValidCurrentUserId && !isSelf) {
      const [followRecord, reverseFollow] = await Promise.all([
        prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: targetUserId,
            },
          },
        }),
        prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: targetUserId,
              followingId: currentUserId,
            },
          },
        }),
      ]);

      if (followRecord) {
        followStatus = followRecord.status === 'ACCEPTED' ? 'following' : 'pending';
      }
      isFollowedBy = reverseFollow?.status === 'ACCEPTED';
    }

    const canViewContent = canViewProfileContent({
      isSelf,
      visibility: targetUser.profileVisibility,
      followStatus,
      isFollowedBy,
    });

    if (!canViewContent) {
      const privacyMessage =
        targetUser.profileVisibility === 'PRIVATE'
          ? `${targetUser.handle ?? 'This user'} account is private`
          : 'This profile is for friends only';

      return NextResponse.json(
        {
          error: 'Not allowed',
          message: privacyMessage,
          canViewContent: false,
          followStatus,
        },
        { status: 403 }
      );
    }

    const allowedVisibilities = mediaVisibilityForViewer({ isSelf, followStatus });

    const where: Prisma.UserMediaWhereInput = {
      userId: targetUserId,
      ...(allowedVisibilities ? { visibility: { in: allowedVisibilities } } : {}),
      ...(type ? { asset: { is: { type } } } : {}),
      ...(cursorPayload
        ? {
            OR: [
              { createdAt: { lt: cursorPayload.createdAt } },
              { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
            ],
          }
        : {}),
    };

    const items = await prisma.userMedia.findMany({
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

    const lastItem = items.at(-1);
    const nextCursor =
      lastItem && items.length === limit
        ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
        : null;

    const responseItems = items.map((m) => ({
      id: m.id,
      title: m.title,
      prompt: m.prompt,
      visibility: m.visibility,
      isPostedToCommunity: m.isPostedToCommunity,
      createdAt: m.createdAt,
      asset: {
        id: m.asset.id,
        type: m.asset.type,
        url: buildMediaUrl(mediaBaseUrl, m.asset.r2Key),
        width: m.asset.width,
        height: m.asset.height,
        durationSeconds: m.asset.durationSeconds,
        posterUrl: buildMediaUrl(mediaBaseUrl, m.asset.posterKey),
        previewUrl: buildMediaUrl(mediaBaseUrl, m.asset.previewKey),
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

    return NextResponse.json({ items: responseItems, nextCursor });
  } catch (error) {
    console.error('Error fetching user media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

