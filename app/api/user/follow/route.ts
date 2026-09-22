export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseLimit(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

// POST /api/user/follow - Follow a user (status based on target's privacy)
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const targetUserId = body.userId?.trim();

    if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
      return NextResponse.json({ error: 'Missing or invalid target userId' }, { status: 400 });
    }

    if (userId === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if target user exists and get their privacy setting
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, profileVisibility: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already following or pending
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json({
        error: existingFollow.status === 'PENDING'
          ? 'Follow request already pending'
          : 'Already following this user',
        status: existingFollow.status,
      }, { status: 409 });
    }

    // Ensure current user exists
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // Determine follow status based on target's privacy
    const followStatus = targetUser.profileVisibility === 'PUBLIC' ? 'ACCEPTED' : 'PENDING';

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
        status: followStatus,
      },
    });

    return NextResponse.json({
      success: true,
      status: follow.status,
      following: follow.status === 'ACCEPTED',
      pending: follow.status === 'PENDING',
    });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user/follow - Unfollow a user (works for both pending and accepted)
export async function DELETE(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const targetUserId = body.userId?.trim();

    if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
      return NextResponse.json({ error: 'Missing or invalid target userId' }, { status: 400 });
    }

    // Delete follow relationship if exists (works for both PENDING and ACCEPTED)
    await prisma.follow.deleteMany({
      where: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    return NextResponse.json({ success: true, following: false, status: null });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/user/follow - Get followers/following list or check status for specific user
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'followers'; // 'followers' or 'following'
  const targetUserId = searchParams.get('userId') ?? userId;
  const checkUserId = searchParams.get('check'); // Optional: check follow status for specific user

  // Pagination params
  const cursor = searchParams.get('cursor'); // follow row id from previous page's nextCursor
  const limit = parseLimit(searchParams.get('limit'));
  const includeTotal = searchParams.get('total') === 'true'; // opt-in total count

  if (!UUID_REGEX.test(targetUserId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  if (cursor && !UUID_REGEX.test(cursor)) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
  }

  try {
    // If checking follow status for a specific user
    if (checkUserId && UUID_REGEX.test(checkUserId) && UUID_REGEX.test(userId)) {
      const followRecord = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: checkUserId,
          },
        },
      });

      return NextResponse.json({
        followStatus: followRecord
          ? (followRecord.status === 'ACCEPTED' ? 'following' : 'pending')
          : 'none',
      });
    }

    if (type === 'following') {
      const whereClause = { followerId: targetUserId, status: 'ACCEPTED' as const };

      const [following, totalCount] = await Promise.all([
        prisma.follow.findMany({
          where: whereClause,
          include: {
            following: {
              select: {
                id: true,
                handle: true,
                avatarUrl: true,
                bio: true,
              },
            },
          },
          // Deterministic ordering: createdAt DESC with id as tie-breaker
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1, // Fetch one extra to detect next page
          ...(cursor
            ? { cursor: { id: cursor }, skip: 1 } // skip the cursor row itself
            : {}),
        }),
        includeTotal
          ? prisma.follow.count({ where: whereClause })
          : Promise.resolve(undefined),
      ]);

      const hasNextPage = following.length > limit;
      const page = hasNextPage ? following.slice(0, limit) : following;
      const nextCursor = hasNextPage ? page[page.length - 1].id : null;

      return NextResponse.json({
        users: page.map((f) => ({
          id: f.following.id,
          handle: f.following.handle,
          avatarUrl: f.following.avatarUrl,
          bio: f.following.bio,
          followedAt: f.createdAt,
          status: f.status,
        })),
        pagination: {
          nextCursor,
          hasNextPage,
          limit,
          ...(totalCount !== undefined && { totalCount }),
        },
      });
    } else {
      // Only return ACCEPTED followers by default
      const whereClause = { followingId: targetUserId, status: 'ACCEPTED' as const };

      const [followers, totalCount] = await Promise.all([
        prisma.follow.findMany({
          where: whereClause,
          include: {
            follower: {
              select: {
                id: true,
                handle: true,
                avatarUrl: true,
                bio: true,
              },
            },
          },
          // Deterministic ordering: createdAt DESC with id as tie-breaker
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1, // Fetch one extra to detect next page
          ...(cursor
            ? { cursor: { id: cursor }, skip: 1 }
            : {}),
        }),
        includeTotal
          ? prisma.follow.count({ where: whereClause })
          : Promise.resolve(undefined),
      ]);

      const hasNextPage = followers.length > limit;
      const page = hasNextPage ? followers.slice(0, limit) : followers;
      const nextCursor = hasNextPage ? page[page.length - 1].id : null;

      return NextResponse.json({
        users: page.map((f) => ({
          id: f.follower.id,
          handle: f.follower.handle,
          avatarUrl: f.follower.avatarUrl,
          bio: f.follower.bio,
          followedAt: f.createdAt,
          status: f.status,
        })),
        pagination: {
          nextCursor,
          hasNextPage,
          limit,
          ...(totalCount !== undefined && { totalCount }),
        },
      });
    }
  } catch (error) {
    // Handle stale/invalid cursor gracefully (Prisma P2025 = record not found)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired cursor' },
        { status: 400 }
      );
    }
    console.error('Error fetching follow list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
