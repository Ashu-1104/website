import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { BadRequestError, getOrCreateUserFromRequest } from '@/lib/community/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

type CursorPayload = { createdAt: string; id: string };

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (typeof parsed.createdAt !== 'string') return null;
    if (typeof parsed.id !== 'string') return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function parseLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const cursorRaw = searchParams.get('cursor');

  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const cursorDateValid = cursorDate ? Number.isFinite(cursorDate.getTime()) : false;
  const cursorPayload =
    cursor && cursorDateValid && cursorDate
      ? { createdAt: cursorDate, id: cursor.id }
      : null;

  const comments = await prisma.communityFeedComment.findMany({
    take: limit,
    where: {
      itemId: params.itemId,
      ...(cursorPayload
        ? {
            OR: [
              { createdAt: { lt: cursorPayload.createdAt } },
              { createdAt: cursorPayload.createdAt, id: { lt: cursorPayload.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { user: true },
  });

  const last = comments.at(-1);
  const nextCursor = last && comments.length === limit
    ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() })
    : null;

  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        handle: comment.user.handle,
      },
    })),
    nextCursor,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const user = await getOrCreateUserFromRequest(request);
    const body = (await request.json()) as { body?: unknown };
    const text = typeof body.body === 'string' ? body.body.trim() : '';

    if (text.length < 1) {
      return NextResponse.json({ error: 'Comment is empty' }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    const comment = await prisma.communityFeedComment.create({
      data: {
        itemId: params.itemId,
        userId: user.id,
        body: text,
      },
      include: { user: true },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        user: { id: comment.user.id, handle: comment.user.handle },
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
