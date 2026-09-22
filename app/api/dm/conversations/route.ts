export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/dm/conversations - List user's DM conversations
export async function GET(request: Request) {
  let userId = '';
  try {
    const user = await requireJwtAuth(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  console.info('[Audit][DM] userId=%s method=GET path=/api/dm/conversations', userId);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const cursor = searchParams.get('cursor');

  try {
    const conversations = await prisma.directConversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { select: { id: true, handle: true, avatarUrl: true } },
        participant2: { select: { id: true, handle: true, avatarUrl: true } },
        readReceipts: {
          where: { userId },
          select: { lastReadAt: true, lastReadMessageId: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, -1) : conversations;

    return NextResponse.json({
      items: items.map((conv) => {
        const otherUser =
          conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        return {
          id: conv.id,
          otherUser,
          lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
          lastMessagePreview: conv.lastMessagePreview,
          lastReadAt: conv.readReceipts[0]?.lastReadAt?.toISOString() ?? null,
          lastReadMessageId: conv.readReceipts[0]?.lastReadMessageId ?? null,
          messageCount: conv._count.messages,
          createdAt: conv.createdAt.toISOString(),
        };
      }),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/dm/conversations - Start a new conversation
export async function POST(request: Request) {
  let userId = '';
  try {
    const user = await requireJwtAuth(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  console.info('[Audit][DM] userId=%s method=POST path=/api/dm/conversations', userId);

  try {
    const body = await request.json();
    const recipientId = body.recipientId?.trim();

    if (!recipientId || !UUID_REGEX.test(recipientId)) {
      return NextResponse.json({ error: 'Invalid recipientId' }, { status: 400 });
    }

    if (userId === recipientId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, handle: true, avatarUrl: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for blocks
    const blocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: userId },
        ],
      },
    });

    if (blocked) {
      return NextResponse.json({ error: 'Cannot message this user' }, { status: 403 });
    }

    // Find or create conversation (order participants consistently)
    const [p1, p2] = [userId, recipientId].sort();

    const conversation = await prisma.directConversation.upsert({
      where: { participant1Id_participant2Id: { participant1Id: p1, participant2Id: p2 } },
      create: { participant1Id: p1, participant2Id: p2 },
      update: {},
      include: {
        participant1: { select: { id: true, handle: true, avatarUrl: true } },
        participant2: { select: { id: true, handle: true, avatarUrl: true } },
      },
    });

    const otherUser =
      conversation.participant1Id === userId
        ? conversation.participant2
        : conversation.participant1;

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          otherUser,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
          lastMessagePreview: conversation.lastMessagePreview,
          createdAt: conversation.createdAt.toISOString(),
          isNew: !conversation.lastMessageAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
