import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ProfileVisibility } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const userDecorations = await prisma.userDecoration.findMany({
      where: {
        userId: targetUserId,
        decoration: {
          is: { isActive: true },
        },
      },
      include: {
        decoration: true,
      },
      orderBy: { acquiredAt: 'desc' },
    });

    const items = userDecorations.map((ud) => ({
      id: ud.id,
      isEquipped: ud.isEquipped,
      acquiredAt: ud.acquiredAt,
      decoration: {
        id: ud.decoration.id,
        name: ud.decoration.name,
        description: ud.decoration.description,
        type: ud.decoration.type,
        imageUrl: ud.decoration.imageUrl,
        cssClass: ud.decoration.cssClass,
        isPremium: ud.decoration.isPremium,
        price: ud.decoration.price,
      },
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching user decorations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

