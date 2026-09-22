export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/dm/conversations/[id] - Get a single conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId = '';
  const { id: conversationId } = await params;

  try {
    const user = await requireJwtAuth(request);
    userId = user.id;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  console.info('[Audit][DM] userId=%s method=GET path=/api/dm/conversations/%s', userId, conversationId);

  if (!conversationId || !UUID_REGEX.test(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
  }

  try {
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
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
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user is participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const otherUser =
      conversation.participant1Id === userId
        ? conversation.participant2
        : conversation.participant1;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherUser,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: conversation.lastMessagePreview,
        lastReadAt: conversation.readReceipts[0]?.lastReadAt?.toISOString() ?? null,
        lastReadMessageId: conversation.readReceipts[0]?.lastReadMessageId ?? null,
        messageCount: conversation._count.messages,
        createdAt: conversation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}
