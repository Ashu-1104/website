export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/user/follow/requests - Get pending follow requests for current user
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const pendingRequests = await prisma.follow.findMany({
      where: {
        followingId: userId,
        status: 'PENDING',
      },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      requests: pendingRequests.map((req) => ({
        id: req.id,
        userId: req.follower.id,
        handle: req.follower.handle,
        avatarUrl: req.follower.avatarUrl,
        bio: req.follower.bio,
        requestedAt: req.createdAt,
      })),
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error('Error fetching follow requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
