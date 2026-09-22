import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';
import { generateCharacterResponse, buildDefaultSystemPrompt } from '@/lib/ai/modelslab';
import { canUserChat, processChatTokens } from '@/lib/chat-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/chat/threads/[id]/messages
 *
 * Get messages for a chat thread with pagination.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Query params:
 * - limit: Number of messages (default: 50, max: 100)
 * - cursor: Message ID for cursor-based pagination (get messages before this)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: threadId } = params;
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

  console.info('[Audit][Chat] userId=%s method=GET path=/api/chat/threads/%s/messages', userId, threadId);

  if (!UUID_REGEX.test(threadId)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  // Verify thread exists and user owns it
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  if (thread.userId !== userId) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const cursor = searchParams.get('cursor');

  const where: Record<string, unknown> = { threadId };

  // For loading older messages (before cursor)
  if (cursor && UUID_REGEX.test(cursor)) {
    const cursorMessage = await prisma.chatMessage.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorMessage) {
      where.createdAt = { lt: cursorMessage.createdAt };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to check if there are more
  });

  const hasMore = messages.length > limit;
  const items = messages.slice(0, limit).reverse();
  const nextCursor = hasMore ? items[0]?.id : null;

  return NextResponse.json({
    messages: items.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    })),
    nextCursor,
    hasMore,
  });
}

/**
 * POST /api/chat/threads/[id]/messages
 *
 * Send a new message in a chat thread.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - content: Message text (required unless mediaUrl is provided)
 * - mediaUrl: URL of attached media (optional)
 * - mediaType: Type of media (IMAGE, VIDEO, AUDIO) (optional)
 * - imageStyle: Image generation style hint (realistic|anime|cartoon) (optional)
 * - role: Message role (USER or ASSISTANT, defaults to USER)
 * - skipAiResponse: If true, skip generating AI response (useful for saving AI-generated content)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: threadId } = params;
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

  console.info('[Audit][Chat] userId=%s method=POST path=/api/chat/threads/%s/messages', userId, threadId);

  if (!UUID_REGEX.test(threadId)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  // Verify thread exists and user owns it
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      character: {
        select: {
          id: true,
          name: true,
          systemPrompt: true,
          firstMessage: true,
          gender: true,
          age: true,
          description: true,
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  if (thread.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only send messages in your own threads.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl : null;
  const mediaType = ['IMAGE', 'VIDEO', 'AUDIO'].includes(body.mediaType as string)
    ? (body.mediaType as string)
    : null;
  const imageStyle = ['realistic', 'anime', 'cartoon'].includes(body.imageStyle as string)
    ? (body.imageStyle as string)
    : null;
  const messageRole = body.role === 'ASSISTANT' ? 'ASSISTANT' : 'USER';
  const skipAiResponse = body.skipAiResponse === true;

  if (!content && !mediaUrl) {
    return NextResponse.json(
      { error: 'Message content or media is required.' },
      { status: 400 }
    );
  }

  // Build metadata if media is attached
  const metadataPayload: Record<string, unknown> = {};
  if (mediaUrl) {
    metadataPayload.mediaUrl = mediaUrl;
    if (mediaType) metadataPayload.mediaType = mediaType;
  }
  if (imageStyle) metadataPayload.imageStyle = imageStyle;
  const metadata =
    Object.keys(metadataPayload).length > 0
      ? (metadataPayload as Prisma.InputJsonValue)
      : undefined;

  // Create message with specified role
  const userMessage = await prisma.chatMessage.create({
    data: {
      threadId,
      role: messageRole,
      content: content || '',
      metadata,
    },
  });

  // Update thread's last message info with user's message
  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      lastMessageAt: userMessage.createdAt,
      lastMessagePreview: content.substring(0, 100) || '[Media]',
    },
  });

  // Generate AI response if character has a system prompt and not skipped
  // Only generate AI response for USER messages, not for ASSISTANT messages (like AI-generated images)
  let aiResponse: {
    id: string;
    role: string;
    content: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  } | null = null;

  if (thread.character && messageRole === 'USER' && !skipAiResponse) {
    try {
      // ── Pre-flight: check daily token limit for free plan ──────────────────
      const chatAllowed = await canUserChat(userId);
      if (!chatAllowed.allowed) {
        // Free plan daily limit hit — return an in-character upsell instead of
        // calling the AI (saves API cost and keeps UX seamless).
        const upsellText =
          `*${thread.character.name} looks at you with longing eyes* ` +
          `I wish we could keep talking, but I've used up all my energy for today... ` +
          `Upgrade your plan and I'll be yours all day, every day. 💕`;

        const limitMessage = await prisma.chatMessage.create({
          data: { threadId, role: 'ASSISTANT', content: upsellText },
        });

        await prisma.chatThread.update({
          where: { id: threadId },
          data: {
            lastMessageAt: limitMessage.createdAt,
            lastMessagePreview: upsellText.substring(0, 100),
          },
        });

        return NextResponse.json(
          {
            message: {
              id: userMessage.id,
              role: userMessage.role,
              content: userMessage.content,
              metadata: userMessage.metadata,
              createdAt: userMessage.createdAt,
            },
            aiResponse: {
              id: limitMessage.id,
              role: limitMessage.role,
              content: limitMessage.content,
              metadata: limitMessage.metadata,
              createdAt: limitMessage.createdAt,
            },
            limitExceeded: true,
          },
          { status: 200 }
        );
      }

      // Get conversation history (last 20 messages)
      const previousMessages = await prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { role: true, content: true },
      });

      // Reverse to get chronological order and format for API
      const conversationHistory = previousMessages
        .reverse()
        .slice(0, -1) // Exclude the message we just created (it's the current user message)
        .map((msg) => ({
          role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        }));

      // Get or build system prompt
      const systemPrompt =
        thread.character.systemPrompt ||
        buildDefaultSystemPrompt({
          name: thread.character.name,
          gender: thread.character.gender ?? undefined,
          age: thread.character.age ?? undefined,
          description: thread.character.description,
        });

      // Call AI service — returns message text + total_tokens consumed
      const { message: aiResponseText, totalTokens } = await generateCharacterResponse(
        systemPrompt,
        conversationHistory,
        content
      );

      // ── Post-response: process tokens silently (credit deduction / daily cap) ──
      processChatTokens(userId, totalTokens).catch((err) => {
        // Token accounting failure must never surface to the user
        console.error('[ChatTokens] processChatTokens error:', err);
      });

      // Create assistant message
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          threadId,
          role: 'ASSISTANT',
          content: aiResponseText,
        },
      });

      // Update thread with AI's response preview
      await prisma.chatThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: assistantMessage.createdAt,
          lastMessagePreview: aiResponseText.substring(0, 100),
        },
      });

      aiResponse = {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.createdAt,
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Continue without AI response - user message is still saved
    }
  }

  return NextResponse.json(
    {
      message: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        metadata: userMessage.metadata,
        createdAt: userMessage.createdAt,
      },
      aiResponse: aiResponse
        ? {
            id: aiResponse.id,
            role: aiResponse.role,
            content: aiResponse.content,
            metadata: aiResponse.metadata,
            createdAt: aiResponse.createdAt,
          }
        : null,
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/chat/threads/[id]/messages
 *
 * Clear all messages in a thread (keep the thread).
 *
 * Headers:
 * - x-vp-user-id: Required.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: threadId } = params;
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

  console.info('[Audit][Chat] userId=%s method=DELETE path=/api/chat/threads/%s/messages', userId, threadId);

  if (!UUID_REGEX.test(threadId)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  if (thread.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only clear messages in your own threads.' },
      { status: 403 }
    );
  }

  const deleted = await prisma.chatMessage.deleteMany({ where: { threadId } });

  // Reset thread state
  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: null,
      unreadCount: 0,
    },
  });

  return NextResponse.json({
    message: 'Messages cleared successfully.',
    deletedCount: deleted.count,
  });
}
