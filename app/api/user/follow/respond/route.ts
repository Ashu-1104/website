export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/user/follow/respond - Accept or reject a follow request
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { requesterId, action } = body;

    if (!requesterId || !UUID_REGEX.test(requesterId)) {
      return NextResponse.json({ error: 'Missing or invalid requesterId' }, { status: 400 });
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be "accept" or "reject"' }, { status: 400 });
    }

    // Find the pending follow request
    const followRequest = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterId,
          followingId: userId,
        },
      },
    });

    if (!followRequest) {
      return NextResponse.json({ error: 'Follow request not found' }, { status: 404 });
    }

    if (followRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'accept') {
      // Update status to ACCEPTED
      await prisma.follow.update({
        where: { id: followRequest.id },
        data: { status: 'ACCEPTED' },
      });
      return NextResponse.json({ success: true, action: 'accepted' });
    } else {
      // Delete the follow request
      await prisma.follow.delete({
        where: { id: followRequest.id },
      });
      return NextResponse.json({ success: true, action: 'rejected' });
    }
  } catch (error) {
    console.error('Error responding to follow request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
