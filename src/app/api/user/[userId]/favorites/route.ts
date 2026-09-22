import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { FavoriteType, ProfileVisibility } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_TYPES: FavoriteType[] = ['IMAGE', 'VIDEO', 'MODEL', 'CHARACTER'];

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

  const type = rawType && VALID_TYPES.includes(rawType as FavoriteType) ? (rawType as FavoriteType) : null;

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
        favoritesPublic: true,
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

    const canViewFavorites = isSelf || (canViewContent && targetUser.favoritesPublic);

    if (!canViewFavorites) {
      return NextResponse.json(
        {
          error: 'Not allowed',
          message: targetUser.favoritesPublic ? 'Favorites are not available' : 'Favorites are private',
        },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = {
      userId: targetUserId,
      ...(type ? { type } : {}),
      ...(cursorPayload
        ? {
            OR: [
              { createdAt: { lt: cursorPayload.createdAt } },
              { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
            ],
          }
        : {}),
    };

    const favorites = await prisma.favorite.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        mediaAsset: true,
        model: {
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            modelType: true,
            favoriteCount: true,
            likeCount: true,
          },
        },
        character: {
          select: {
            id: true,
            name: true,
            description: true,
            style: true,
            characterAvatarUrl: true,
          },
        },
      },
    });

    const lastItem = favorites.at(-1);
    const nextCursor =
      lastItem && favorites.length === limit
        ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt.toISOString() })
        : null;

    const items = favorites.map((fav) => {
      if (fav.mediaAsset) {
        return {
          id: fav.id,
          type: fav.type,
          createdAt: fav.createdAt,
          item: {
            id: fav.mediaAsset.id,
            type: fav.mediaAsset.type,
            url: buildMediaUrl(mediaBaseUrl, fav.mediaAsset.r2Key),
            width: fav.mediaAsset.width,
            height: fav.mediaAsset.height,
            durationSeconds: fav.mediaAsset.durationSeconds,
            posterUrl: buildMediaUrl(mediaBaseUrl, fav.mediaAsset.posterKey),
            previewUrl: buildMediaUrl(mediaBaseUrl, fav.mediaAsset.previewKey),
          },
        };
      }

      if (fav.model) {
        return {
          id: fav.id,
          type: fav.type,
          createdAt: fav.createdAt,
          item: fav.model,
        };
      }

      if (fav.character) {
        const avatarUrl = fav.character.characterAvatarUrl ?? null;
        return {
          id: fav.id,
          type: fav.type,
          createdAt: fav.createdAt,
          item: {
            ...fav.character,
            avatarAsset: avatarUrl ? { url: avatarUrl, width: null, height: null } : null,
          },
        };
      }

      return {
        id: fav.id,
        type: fav.type,
        createdAt: fav.createdAt,
        item: null,
      };
    });

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
