import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ProfileVisibility, UserMediaVisibility } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapVisibilityToString(visibility: ProfileVisibility): 'public' | 'private' | 'friends-only' {
  switch (visibility) {
    case 'PRIVATE':
      return 'private';
    case 'FRIENDS_ONLY':
      return 'friends-only';
    default:
      return 'public';
  }
}

// GET /api/user/[userId] - Get any user's public profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: targetUserId } = await params;
  const currentUserId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.isDeactivated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValidCurrentUserId = UUID_REGEX.test(currentUserId);

    // Block checks (either direction)
    if (isValidCurrentUserId && currentUserId !== targetUserId) {
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

    // Compute relationship flags
    const isSelf = isValidCurrentUserId && currentUserId === targetUserId;
    const needsFollowCheck = isValidCurrentUserId && !isSelf;
    // Only need reverse follow check for FRIENDS_ONLY visibility
    const needsReverseFollowCheck =
      needsFollowCheck && targetUser.profileVisibility === 'FRIENDS_ONLY';

    // Batch 1: Always-needed counts + conditional relationship queries (all independent, run in parallel)
    // FIX #1: followRecord and reverseFollow now run in PARALLEL instead of sequentially
    // FIX #2: reverseFollow only queried when visibility is FRIENDS_ONLY (saves 1 query otherwise)
    const [
      acceptedFollowersCount,
      acceptedFollowingCount,
      followRecord,
      reverseFollow,
    ] = await Promise.all([
      prisma.follow.count({
        where: { followingId: targetUserId, status: 'ACCEPTED' },
      }),
      prisma.follow.count({
        where: { followerId: targetUserId, status: 'ACCEPTED' },
      }),
      needsFollowCheck
        ? prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: targetUserId,
              },
            },
          })
        : Promise.resolve(null),
      needsReverseFollowCheck
        ? prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: targetUserId,
                followingId: currentUserId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    // Derive follow status from query results
    let followStatus: 'none' | 'pending' | 'following' = 'none';
    if (followRecord) {
      followStatus = followRecord.status === 'ACCEPTED' ? 'following' : 'pending';
    }
    const isFollowedBy = reverseFollow?.status === 'ACCEPTED';

    // Determine content visibility
    const visibility = targetUser.profileVisibility;
    let canViewContent = false;
    let privacyMessage: string | null = null;

    if (isSelf || visibility === 'PUBLIC') {
      canViewContent = true;
    } else if (visibility === 'PRIVATE') {
      canViewContent = followStatus === 'following';
      if (!canViewContent) {
        privacyMessage = `${targetUser.handle ?? 'This user'} account is private`;
      }
    } else if (visibility === 'FRIENDS_ONLY') {
      // Friends = mutual follows (both ACCEPTED)
      canViewContent = followStatus === 'following' && isFollowedBy === true;
      if (!canViewContent) {
        privacyMessage = 'This profile is for friends only';
      }
    }

    // Determine favorites visibility (separate toggle, still gated behind content visibility for non-self)
    const canViewFavorites = isSelf || (canViewContent && targetUser.favoritesPublic);

    // Build response
    const response: Record<string, unknown> = {
      id: targetUser.id,
      handle: targetUser.handle,
      avatarUrl: targetUser.avatarUrl,
      bannerUrl: targetUser.bannerUrl,
      bio: targetUser.bio,
      avatarDecoration: targetUser.avatarDecoration,
      avatarDecorationUrl: targetUser.avatarDecorationUrl ?? null,
      profileVisibility: mapVisibilityToString(visibility),
      favoritesPublic: targetUser.favoritesPublic,
      createdAt: targetUser.createdAt,
      // Stats (always visible)
      followersCount: acceptedFollowersCount,
      followingCount: acceptedFollowingCount,
      // Relationship info
      followStatus,
      isSelf,
      canViewContent,
      canViewFavorites,
      privacyMessage,
      connections: {
        discord: targetUser.discordHandle ?? '',
        x: targetUser.twitterHandle ?? '',
        reddit: targetUser.redditHandle ?? '',
        instagram: targetUser.instagramHandle ?? '',
        website: targetUser.websiteUrl ?? '',
      },
    };

    // Include content counts only if viewable
    if (canViewContent) {
      const canSeeFollowerOnly = isSelf || followStatus === 'following';
      const mediaVisibility: { in: UserMediaVisibility[] } | undefined = isSelf
        ? undefined
        : canSeeFollowerOnly
          ? { in: ['PUBLIC', 'FOLLOWERS_ONLY'] as UserMediaVisibility[] }
          : { in: ['PUBLIC'] as UserMediaVisibility[] };

      // FIX #3: Content counts (models, characters, community) moved here from
      // the unconditional batch — eliminates 3 wasted queries for locked profiles
      const [
        imagesCount,
        videosCount,
        decorationsCount,
        publicModelsCount,
        charactersCount,
        communityItemsCount,
      ] = await Promise.all([
        prisma.userMedia.count({
          where: {
            userId: targetUserId,
            ...(mediaVisibility ? { visibility: mediaVisibility } : {}),
            asset: { is: { type: 'IMAGE' } },
          },
        }),
        prisma.userMedia.count({
          where: {
            userId: targetUserId,
            ...(mediaVisibility ? { visibility: mediaVisibility } : {}),
            asset: { is: { type: 'VIDEO' } },
          },
        }),
        prisma.userDecoration.count({
          where: {
            userId: targetUserId,
            decoration: { is: { isActive: true } },
          },
        }),
        prisma.userUploadedModel.count({
          where: { userId: targetUserId, isPublic: true },
        }),
        prisma.aICharacter.count({
          where: { userId: targetUserId, isNsfw: false },
        }),
        prisma.communityFeedItem.count({
          where: { userId: targetUserId },
        }),
      ]);

      response.imagesCount = imagesCount;
      response.videosCount = videosCount;
      response.modelsCount = publicModelsCount;
      response.charactersCount = charactersCount;
      response.decorationsCount = decorationsCount;
      response.communityItemsCount = communityItemsCount;

      if (canViewFavorites) {
        const [favoriteImagesCount, favoriteVideosCount, favoriteModelsCount, favoriteCharactersCount] = await Promise.all([
          prisma.favorite.count({ where: { userId: targetUserId, type: 'IMAGE' } }),
          prisma.favorite.count({ where: { userId: targetUserId, type: 'VIDEO' } }),
          prisma.favorite.count({ where: { userId: targetUserId, type: 'MODEL' } }),
          prisma.favorite.count({ where: { userId: targetUserId, type: 'CHARACTER' } }),
        ]);

        response.favoritesCount =
          favoriteImagesCount + favoriteVideosCount + favoriteModelsCount + favoriteCharactersCount;
        response.favoritesByType = {
          images: favoriteImagesCount,
          videos: favoriteVideosCount,
          models: favoriteModelsCount,
          partners: favoriteCharactersCount,
          aiAudio: 0,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
