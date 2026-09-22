import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/chat/threads/[id]
 *
 * Get a single chat thread with its recent messages.
 *
 * Headers:
 * - x-vp-user-id: Required.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
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

  console.info('[Audit][Chat] userId=%s method=GET path=/api/chat/threads/%s', userId, id);

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id },
    include: {
      character: {
        select: {
          id: true,
          name: true,
          description: true,
          style: true,
          systemPrompt: true,
          firstMessage: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  // Verify ownership
  if (thread.userId !== userId) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  // Mark messages as read
  if (thread.unreadCount > 0) {
    await prisma.chatThread.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      characterId: thread.characterId,
      characterName: thread.characterName || thread.character?.name,
      characterAvatarUrl: thread.characterAvatarUrl,
      lastMessageAt: thread.lastMessageAt,
      unreadCount: 0,
      isPinned: thread.isPinned,
      isArchived: thread.isArchived,
      isMuted: thread.isMuted,
      createdAt: thread.createdAt,
      character: thread.character
        ? {
            id: thread.character.id,
            name: thread.character.name,
            description: thread.character.description,
            style: thread.character.style,
            systemPrompt: thread.character.systemPrompt,
            firstMessage: thread.character.firstMessage,
          }
        : null,
      messages: thread.messages.reverse().map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })),
    },
  });
}

/**
 * PUT /api/chat/threads/[id]
 *
 * Update a chat thread (pin, archive, mute).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - isPinned: boolean (optional)
 * - isArchived: boolean (optional)
 * - isMuted: boolean (optional)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
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

  console.info('[Audit][Chat] userId=%s method=PUT path=/api/chat/threads/%s', userId, id);

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({ where: { id } });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  if (thread.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only update your own threads.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.isPinned === 'boolean') {
    updateData.isPinned = body.isPinned;
  }

  if (typeof body.isArchived === 'boolean') {
    updateData.isArchived = body.isArchived;
  }

  if (typeof body.isMuted === 'boolean') {
    updateData.isMuted = body.isMuted;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const updated = await prisma.chatThread.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    thread: {
      id: updated.id,
      characterId: updated.characterId,
      characterName: updated.characterName,
      isPinned: updated.isPinned,
      isArchived: updated.isArchived,
      isMuted: updated.isMuted,
      updatedAt: updated.updatedAt,
    },
  });
}

/**
 * DELETE /api/chat/threads/[id]
 *
 * Delete a chat thread and all its messages.
 *
 * Headers:
 * - x-vp-user-id: Required.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
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

  console.info('[Audit][Chat] userId=%s method=DELETE path=/api/chat/threads/%s', userId, id);

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid thread ID format.' }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({ where: { id } });

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  if (thread.userId !== userId) {
    return NextResponse.json(
      { error: 'Forbidden. You can only delete your own threads.' },
      { status: 403 }
    );
  }

  // Delete thread (messages will be cascade deleted due to schema relation)
  await prisma.chatThread.delete({ where: { id } });

  return NextResponse.json({ message: 'Thread deleted successfully.', id });
}
