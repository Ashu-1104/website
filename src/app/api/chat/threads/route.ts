import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { AuthError, requireJwtAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/chat/threads
 *
 * Get user's chat threads (conversations with AI characters).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Query params:
 * - archived: Filter by archived status (true/false)
 * - pinned: Filter by pinned status (true/false)
 * - limit: Number of items (default: 20)
 */
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

  console.info('[Audit][Chat] userId=%s method=GET path=/api/chat/threads', userId);

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get('archived');
  const pinned = searchParams.get('pinned');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const where: Record<string, unknown> = { userId };

  if (archived === 'true') {
    where.isArchived = true;
  } else if (archived === 'false') {
    where.isArchived = false;
  }

  if (pinned === 'true') {
    where.isPinned = true;
  } else if (pinned === 'false') {
    where.isPinned = false;
  }

  const threads = await prisma.chatThread.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
    take: limit,
    include: {
      character: {
        select: {
          id: true,
          name: true,
          description: true,
          style: true,
          characterAvatarUrl: true,
        },
      },
    },
  });

  const items = threads.map((thread) => {
    const fallbackAvatarUrl = thread.character?.characterAvatarUrl ?? null;
    return {
      id: thread.id,
      characterId: thread.characterId,
      characterName: thread.characterName || thread.character?.name,
      characterAvatarUrl: thread.characterAvatarUrl || fallbackAvatarUrl,
      lastMessageAt: thread.lastMessageAt,
      lastMessagePreview: thread.lastMessagePreview,
      unreadCount: thread.unreadCount,
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
          }
        : null,
    };
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/chat/threads
 *
 * Create a new chat thread with an AI character (or get existing one).
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - characterId: UUID of the AI character (required)
 */
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

  console.info('[Audit][Chat] userId=%s method=POST path=/api/chat/threads', userId);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const characterId = body.characterId as string;
  if (!characterId || !UUID_REGEX.test(characterId)) {
    return NextResponse.json({ error: 'Valid characterId is required.' }, { status: 400 });
  }

  // Verify character exists
  const character = await prisma.aICharacter.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      characterAvatarUrl: true,
    },
  });

  if (!character) {
    return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
  }

  // Check if thread already exists (upsert pattern)
  const existingThread = await prisma.chatThread.findUnique({
    where: {
      userId_characterId: {
        userId,
        characterId,
      },
    },
    include: {
      character: {
        select: { id: true, name: true, description: true },
      },
    },
  });

  if (existingThread) {
    // Unarchive if archived; also backfill avatar if missing
    const needsUpdate = existingThread.isArchived || !existingThread.characterAvatarUrl;
    if (needsUpdate) {
      const backfillAvatar = !existingThread.characterAvatarUrl
        ? (character.characterAvatarUrl ?? undefined)
        : undefined;
      await prisma.chatThread.update({
        where: { id: existingThread.id },
        data: {
          ...(existingThread.isArchived ? { isArchived: false } : {}),
          ...(backfillAvatar ? { characterAvatarUrl: backfillAvatar } : {}),
        },
      });
    }

    return NextResponse.json({
      thread: {
        id: existingThread.id,
        characterId: existingThread.characterId,
        characterName: existingThread.characterName || existingThread.character?.name,
        characterAvatarUrl: existingThread.characterAvatarUrl || character.characterAvatarUrl,
        lastMessageAt: existingThread.lastMessageAt,
        unreadCount: existingThread.unreadCount,
        isPinned: existingThread.isPinned,
        isArchived: false,
        createdAt: existingThread.createdAt,
        isNew: false,
      },
    });
  }

  // Create new thread
  const characterAvatarUrl = character.characterAvatarUrl;
  const thread = await prisma.chatThread.create({
    data: {
      userId,
      characterId,
      characterName: character.name,
      characterAvatarUrl,
    },
    include: {
      character: {
        select: { id: true, name: true, description: true, firstMessage: true },
      },
    },
  });

  // Increment usage count on character
  await prisma.aICharacter.update({
    where: { id: characterId },
    data: { usageCount: { increment: 1 } },
  });

  // Auto-send first message from character if available
  let firstMessageData: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  } | null = null;

  if (thread.character.firstMessage) {
    const firstMsg = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'ASSISTANT',
        content: thread.character.firstMessage,
      },
    });

    // Update thread with first message preview
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: firstMsg.createdAt,
        lastMessagePreview: thread.character.firstMessage.substring(0, 100),
      },
    });

    firstMessageData = {
      id: firstMsg.id,
      role: firstMsg.role,
      content: firstMsg.content,
      createdAt: firstMsg.createdAt,
    };
  }

  return NextResponse.json(
    {
      thread: {
        id: thread.id,
        characterId: thread.characterId,
        characterName: thread.characterName,
        characterAvatarUrl: thread.characterAvatarUrl,
        lastMessageAt: thread.lastMessageAt,
        unreadCount: thread.unreadCount,
        isPinned: thread.isPinned,
        isArchived: thread.isArchived,
        createdAt: thread.createdAt,
        isNew: true,
        character: {
          id: thread.character.id,
          name: thread.character.name,
          firstMessage: thread.character.firstMessage,
        },
        // Include the first message so the UI can display it immediately
        firstMessage: firstMessageData,
      },
    },
    { status: 201 }
  );
}
