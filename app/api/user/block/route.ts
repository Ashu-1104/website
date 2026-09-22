export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/user/block - Block a user (by handle or userId)
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const targetHandle = body.handle?.trim();
    const targetUserId = body.userId?.trim();

    let targetUser;

    if (targetUserId && UUID_REGEX.test(targetUserId)) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (targetHandle) {
      targetUser = await prisma.user.findUnique({ where: { handle: targetHandle } });
    } else {
      return NextResponse.json({ error: 'Missing handle or userId to block' }, { status: 400 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userId === targetUser.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Ensure current user exists
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });

    // Check if already blocked
    const existingBlock = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUser.id,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json({ error: 'User already blocked' }, { status: 409 });
    }

    // Create block relationship
    await prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: targetUser.id,
      },
    });

    // Also remove any follow relationships in both directions
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetUser.id },
          { followerId: targetUser.id, followingId: userId },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      blocked: true,
      blockedUser: {
        id: targetUser.id,
        handle: targetUser.handle,
      },
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user/block - Unblock a user
export async function DELETE(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const targetHandle = body.handle?.trim();
    const targetUserId = body.userId?.trim();

    let targetUser;

    if (targetUserId && UUID_REGEX.test(targetUserId)) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (targetHandle) {
      targetUser = await prisma.user.findUnique({ where: { handle: targetHandle } });
    } else {
      return NextResponse.json({ error: 'Missing handle or userId to unblock' }, { status: 400 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete block relationship if exists
    await prisma.userBlock.deleteMany({
      where: {
        blockerId: userId,
        blockedId: targetUser.id,
      },
    });

    return NextResponse.json({ success: true, blocked: false });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/user/block - Get list of blocked users
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const blockedUsers = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blockedUser: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      blockedUsers: blockedUsers.map((b) => ({
        id: b.blockedUser.id,
        handle: b.blockedUser.handle,
        avatarUrl: b.blockedUser.avatarUrl,
        blockedAt: b.createdAt,
      })),
      blockedHandles: blockedUsers
        .map((b) => b.blockedUser.handle)
        .filter((h): h is string => h !== null),
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
