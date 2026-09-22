import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { BadRequestError, getOrCreateUserFromRequest } from '@/lib/community/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EMOJI_LENGTH = 8;

export async function POST(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const user = await getOrCreateUserFromRequest(request);
    const payload = (await request.json()) as { emoji?: unknown };
    const emoji = typeof payload.emoji === 'string' ? payload.emoji.trim() : '';

    if (emoji.length < 1 || emoji.length > MAX_EMOJI_LENGTH) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const existing = await prisma.communityFeedReaction.findUnique({
      where: {
        userId_itemId_emoji: {
          userId: user.id,
          itemId: params.itemId,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.communityFeedReaction.delete({
        where: {
          userId_itemId_emoji: {
            userId: user.id,
            itemId: params.itemId,
            emoji,
          },
        },
      });
    } else {
      await prisma.communityFeedReaction.create({
        data: {
          userId: user.id,
          itemId: params.itemId,
          emoji,
        },
      });
    }

    const counts = await prisma.communityFeedReaction.groupBy({
      by: ['emoji'],
      where: { itemId: params.itemId },
      _count: { emoji: true },
    });

    return NextResponse.json({
      reactions: counts.map((record) => ({
        emoji: record.emoji,
        count: record._count.emoji,
      })),
      toggledOn: !existing,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

