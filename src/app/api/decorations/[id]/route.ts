import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/decorations/[id]
 *
 * Fetch a single decoration by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid decoration ID format.' }, { status: 400 });
  }

  const decoration = await prisma.decoration.findUnique({
    where: { id, isActive: true },
  });

  if (!decoration) {
    return NextResponse.json({ error: 'Decoration not found.' }, { status: 404 });
  }

  // Check if user owns this decoration
  let isOwned = false;
  let isEquipped = false;

  if (UUID_REGEX.test(userId)) {
    const userDecoration = await prisma.userDecoration.findFirst({
      where: { userId, decorationId: id },
    });
    isOwned = !!userDecoration;
    isEquipped = userDecoration?.isEquipped ?? false;
  }

  return NextResponse.json({
    decoration: {
      id: decoration.id,
      name: decoration.name,
      description: decoration.description,
      type: decoration.type,
      imageUrl: decoration.imageUrl,
      cssClass: decoration.cssClass,
      isPremium: decoration.isPremium,
      price: decoration.price,
      createdAt: decoration.createdAt,
      isOwned,
      isEquipped,
    },
  });
}
