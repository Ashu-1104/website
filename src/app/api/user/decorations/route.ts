import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/user/decorations
 *
 * Fetch decorations owned by the current user.
 *
 * Headers:
 * - x-vp-user-id: Required. The user's ID.
 *
 * Query params:
 * - type: Filter by decoration type
 * - equipped: Filter by equipped status (true/false)
 */
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const equipped = searchParams.get('equipped');

  const validTypes = ['AVATAR_FRAME', 'AVATAR_GLOW', 'AVATAR_EFFECT', 'BANNER'];

  const where: Record<string, unknown> = {
    userId,
    decoration: {
      isActive: true,
    },
  };

  if (type && validTypes.includes(type)) {
    where.decoration = { ...where.decoration as object, type };
  }

  if (equipped === 'true') {
    where.isEquipped = true;
  } else if (equipped === 'false') {
    where.isEquipped = false;
  }

  const userDecorations = await prisma.userDecoration.findMany({
    where,
    include: {
      decoration: true,
    },
    orderBy: { acquiredAt: 'desc' },
  });

  const items = userDecorations.map((ud) => ({
    id: ud.id,
    isEquipped: ud.isEquipped,
    acquiredAt: ud.acquiredAt,
    decoration: {
      id: ud.decoration.id,
      name: ud.decoration.name,
      description: ud.decoration.description,
      type: ud.decoration.type,
      imageUrl: ud.decoration.imageUrl,
      cssClass: ud.decoration.cssClass,
      isPremium: ud.decoration.isPremium,
      price: ud.decoration.price,
    },
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/user/decorations
 *
 * Acquire (purchase) a decoration for the user.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - decorationId: UUID of the decoration to acquire
 */
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const decorationId = body.decorationId as string;
  if (!decorationId || !UUID_REGEX.test(decorationId)) {
    return NextResponse.json({ error: 'Valid decorationId is required.' }, { status: 400 });
  }

  // Check if decoration exists
  const decoration = await prisma.decoration.findUnique({
    where: { id: decorationId, isActive: true },
  });

  if (!decoration) {
    return NextResponse.json({ error: 'Decoration not found.' }, { status: 404 });
  }

  // Check if user already owns it
  const existing = await prisma.userDecoration.findFirst({
    where: { userId, decorationId },
  });

  if (existing) {
    return NextResponse.json({ error: 'You already own this decoration.' }, { status: 400 });
  }

  // TODO: Add credit/payment check here when subscription system is integrated
  // For now, just grant the decoration

  const userDecoration = await prisma.userDecoration.create({
    data: {
      userId,
      decorationId,
      isEquipped: false,
    },
    include: {
      decoration: true,
    },
  });

  return NextResponse.json(
    {
      userDecoration: {
        id: userDecoration.id,
        isEquipped: userDecoration.isEquipped,
        acquiredAt: userDecoration.acquiredAt,
        decoration: {
          id: userDecoration.decoration.id,
          name: userDecoration.decoration.name,
          type: userDecoration.decoration.type,
          imageUrl: userDecoration.decoration.imageUrl,
        },
      },
    },
    { status: 201 }
  );
}

/**
 * PUT /api/user/decorations
 *
 * Equip or unequip a decoration.
 *
 * Headers:
 * - x-vp-user-id: Required.
 *
 * Body:
 * - decorationId: UUID of the decoration
 * - equip: boolean (true to equip, false to unequip)
 */
export async function PUT(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: 'Unauthorized. Missing or invalid x-vp-user-id header.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const decorationId = body.decorationId as string;
  const equip = body.equip === true;

  if (!decorationId || !UUID_REGEX.test(decorationId)) {
    return NextResponse.json({ error: 'Valid decorationId is required.' }, { status: 400 });
  }

  // Find user's decoration
  const userDecoration = await prisma.userDecoration.findFirst({
    where: { userId, decorationId },
    include: { decoration: true },
  });

  if (!userDecoration) {
    return NextResponse.json({ error: 'You do not own this decoration.' }, { status: 404 });
  }

  // If equipping, unequip other decorations of the same type first
  if (equip) {
    await prisma.userDecoration.updateMany({
      where: {
        userId,
        isEquipped: true,
        decoration: {
          type: userDecoration.decoration.type,
        },
      },
      data: { isEquipped: false },
    });
  }

  // Update this decoration
  const updated = await prisma.userDecoration.update({
    where: { id: userDecoration.id },
    data: { isEquipped: equip },
    include: { decoration: true },
  });

  return NextResponse.json({
    userDecoration: {
      id: updated.id,
      isEquipped: updated.isEquipped,
      acquiredAt: updated.acquiredAt,
      decoration: {
        id: updated.decoration.id,
        name: updated.decoration.name,
        type: updated.decoration.type,
        imageUrl: updated.decoration.imageUrl,
      },
    },
  });
}
