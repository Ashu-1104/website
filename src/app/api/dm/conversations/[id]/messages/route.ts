export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/dm/conversations/[id]/messages - Get messages with pagination
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

  console.info('[Audit][DM] userId=%s method=GET path=/api/dm/conversations/%s/messages', userId, conversationId);

  if (!conversationId || !UUID_REGEX.test(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
  }

  try {
    // Verify user is participant
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const cursor = searchParams.get('cursor');
    const direction = searchParams.get('direction') || 'older'; // 'older' or 'newer'

    const messages = await prisma.directMessage.findMany({
      where: { conversationId, isDeleted: false },
      include: {
        sender: { select: { id: true, handle: true, avatarUrl: true } },
      },
      orderBy: { createdAt: direction === 'newer' ? 'asc' : 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    // Return in chronological order (oldest first)
    const orderedItems = direction === 'newer' ? items : items.reverse();

    return NextResponse.json({
      messages: orderedItems.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt?.toISOString() ?? null,
        createdAt: msg.createdAt.toISOString(),
        sender: msg.sender,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/dm/conversations/[id]/messages - Send a message (HTTP fallback for socket)
export async function POST(
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

  console.info('[Audit][DM] userId=%s method=POST path=/api/dm/conversations/%s/messages', userId, conversationId);

  if (!conversationId || !UUID_REGEX.test(conversationId)) {
    return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify user is participant
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the message
    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
      },
      include: {
        sender: { select: { id: true, handle: true, avatarUrl: true } },
      },
    });

    // Update conversation's lastMessage fields
    await prisma.directConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: content.substring(0, 100),
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt?.toISOString() ?? null,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
