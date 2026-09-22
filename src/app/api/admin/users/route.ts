import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/auth';
import { isValidUuid } from '@/lib/webhooks/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 *
 * List all users with pagination and search.
 * Query params: page (default 1), limit (default 25), search (optional).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));
  const search = searchParams.get('search')?.trim() ?? '';
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { handle: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        handle: true,
        email: true,
        role: true,
        isAdmin: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        avatarDecoration: true,
        avatarDecorationUrl: true,
        profileVisibility: true,
        favoritesPublic: true,
        isDeactivated: true,
        emailVerified: true,
        phone: true,
        discordHandle: true,
        twitterHandle: true,
        redditHandle: true,
        instagramHandle: true,
        websiteUrl: true,
        emailNotifyMessages: true,
        emailNotifyFollows: true,
        emailNotifyProduct: true,
        pushNotifyMessages: true,
        pushNotifyFollows: true,
        pushNotifyProduct: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            characters: true,
            uploadedModels: true,
            generationJobs: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * PATCH /api/admin/users
 *
 * Update a user by id.
 */
export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const targetId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!isValidUuid(targetId)) {
    return NextResponse.json({ error: 'Valid user id is required.' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  // Profile fields
  if (typeof body.handle === 'string') data.handle = body.handle.trim() || null;
  const nextEmail = typeof body.email === 'string' ? body.email.trim() || null : undefined;
  if (nextEmail !== undefined) data.email = nextEmail;
  if (typeof body.bio === 'string') data.bio = body.bio.trim() || null;
  if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl.trim() || null;
  if (typeof body.bannerUrl === 'string') data.bannerUrl = body.bannerUrl.trim() || null;
  if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;

  // Settings
  const validVisibility = ['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY'];
  if (typeof body.profileVisibility === 'string' && validVisibility.includes(body.profileVisibility)) {
    data.profileVisibility = body.profileVisibility;
  }
  const validRoles = ['USER', 'ADMIN', 'SUPPORT', 'DEVELOPER'];
  if (typeof body.role === 'string' && validRoles.includes(body.role)) {
    data.role = body.role;
    data.isAdmin = body.role !== 'USER';
  }
  const validDecorations = ['NONE', 'PINK_GLOW', 'GOLD_CROWN', 'RAINBOW_RING', 'FIRE_RING', 'DIAMOND'];
  if (typeof body.avatarDecoration === 'string' && validDecorations.includes(body.avatarDecoration)) {
    data.avatarDecoration = body.avatarDecoration;
  }
  if (typeof body.avatarDecorationUrl === 'string') data.avatarDecorationUrl = body.avatarDecorationUrl.trim() || null;
  if (typeof body.favoritesPublic === 'boolean') data.favoritesPublic = body.favoritesPublic;
  if (typeof body.isDeactivated === 'boolean') data.isDeactivated = body.isDeactivated;

  // Social
  if (typeof body.discordHandle === 'string') data.discordHandle = body.discordHandle.trim() || null;
  if (typeof body.twitterHandle === 'string') data.twitterHandle = body.twitterHandle.trim() || null;
  if (typeof body.redditHandle === 'string') data.redditHandle = body.redditHandle.trim() || null;
  if (typeof body.instagramHandle === 'string') data.instagramHandle = body.instagramHandle.trim() || null;
  if (typeof body.websiteUrl === 'string') data.websiteUrl = body.websiteUrl.trim() || null;

  // Notifications
  if (typeof body.emailNotifyMessages === 'boolean') data.emailNotifyMessages = body.emailNotifyMessages;
  if (typeof body.emailNotifyFollows === 'boolean') data.emailNotifyFollows = body.emailNotifyFollows;
  if (typeof body.emailNotifyProduct === 'boolean') data.emailNotifyProduct = body.emailNotifyProduct;
  if (typeof body.pushNotifyMessages === 'boolean') data.pushNotifyMessages = body.pushNotifyMessages;
  if (typeof body.pushNotifyFollows === 'boolean') data.pushNotifyFollows = body.pushNotifyFollows;
  if (typeof body.pushNotifyProduct === 'boolean') data.pushNotifyProduct = body.pushNotifyProduct;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: targetId },
      data,
    });
    if (nextEmail !== undefined) {
      await prisma.aICharacter.updateMany({
        where: { userId: targetId },
        data: { userEmail: nextEmail },
      });
    }
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
