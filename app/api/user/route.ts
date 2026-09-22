export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProfileVisibility, AvatarDecoration } from '@prisma/client';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper to map DB enum to frontend string
function mapVisibilityToString(visibility: ProfileVisibility): 'public' | 'private' | 'friends-only' {
  switch (visibility) {
    case 'PRIVATE':
      return 'private';
    case 'FRIENDS_ONLY':
      return 'friends-only';
    default:
      return 'public';
  }
}

function mapStringToVisibility(visibility: string): ProfileVisibility {
  switch (visibility) {
    case 'private':
      return 'PRIVATE';
    case 'friends-only':
      return 'FRIENDS_ONLY';
    default:
      return 'PUBLIC';
  }
}

function mapDecorationToString(decoration: AvatarDecoration): 'none' | 'pink-glow' | 'purple-glow' | 'gold-frame' {
  switch (decoration) {
    case 'PINK_GLOW':
      return 'pink-glow';
    case 'PURPLE_GLOW':
      return 'purple-glow';
    case 'GOLD_FRAME':
      return 'gold-frame';
    default:
      return 'none';
  }
}

function mapStringToDecoration(decoration: string): AvatarDecoration {
  switch (decoration) {
    case 'pink-glow':
      return 'PINK_GLOW';
    case 'purple-glow':
      return 'PURPLE_GLOW';
    case 'gold-frame':
      return 'GOLD_FRAME';
    default:
      return 'NONE';
  }
}

// GET /api/user - Get current user profile
export async function GET(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get blocked handles for this user
    const blockedUsers = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: { blockedUser: { select: { handle: true } } },
    });

    const blockedHandles = blockedUsers
      .map((b) => b.blockedUser.handle)
      .filter((h): h is string => h !== null);

    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      createdAt: user.createdAt,
      // Account
      email: user.email,
      phone: user.phone,
      // Profile
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      avatarDecoration: mapDecorationToString(user.avatarDecoration),
      avatarDecorationUrl: user.avatarDecorationUrl ?? null,
      // Privacy
      profileVisibility: mapVisibilityToString(user.profileVisibility),
      favoritesPublic: user.favoritesPublic,
      isDeactivated: user.isDeactivated,
      blockedHandles,
      // Notifications
      notifications: {
        email: {
          messages: user.emailNotifyMessages,
          follows: user.emailNotifyFollows,
          product: user.emailNotifyProduct,
        },
        push: {
          messages: user.pushNotifyMessages,
          follows: user.pushNotifyFollows,
          product: user.pushNotifyProduct,
        },
      },
      // Connections
      connections: {
        discord: user.discordHandle ?? '',
        x: user.twitterHandle ?? '',
        reddit: user.redditHandle ?? '',
        instagram: user.instagramHandle ?? '',
        website: user.websiteUrl ?? '',
      },
      // Preferences
      enableNsfwContent: user.enableNsfwContent,
      // Stats
      followersCount: user._count.followers,
      followingCount: user._count.following,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/user - Update current user profile
export async function PATCH(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Handle field
    if (typeof body.handle === 'string') {
      const trimmedHandle = body.handle.trim();
      if (trimmedHandle.length > 0) {
        // Check if handle is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: { handle: trimmedHandle, NOT: { id: userId } },
        });
        if (existingUser) {
          return NextResponse.json({ error: 'Handle already taken' }, { status: 409 });
        }
        updateData.handle = trimmedHandle;
      }
    }

    // Account fields
    if (typeof body.email === 'string') {
      const trimmedEmail = body.email.trim();
      if (trimmedEmail.length > 0) {
        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: { email: trimmedEmail, NOT: { id: userId } },
        });
        if (existingUser) {
          return NextResponse.json({ error: 'Email already taken' }, { status: 409 });
        }
      }
      updateData.email = trimmedEmail || null;
    }
    if (typeof body.phone === 'string') {
      updateData.phone = body.phone.trim() || null;
    }

    // Profile fields
    if (typeof body.avatarUrl === 'string') {
      updateData.avatarUrl = body.avatarUrl.trim() || null;
    }
    if (typeof body.bannerUrl === 'string') {
      updateData.bannerUrl = body.bannerUrl.trim() || null;
    }
    if (typeof body.bio === 'string') {
      updateData.bio = body.bio.slice(0, 280);
    }
    if (typeof body.avatarDecoration === 'string') {
      updateData.avatarDecoration = mapStringToDecoration(body.avatarDecoration);
    }
    if (body.avatarDecorationUrl !== undefined) {
      updateData.avatarDecorationUrl = typeof body.avatarDecorationUrl === 'string'
        ? body.avatarDecorationUrl.trim() || null
        : null;
    }

    // Privacy fields
    if (typeof body.profileVisibility === 'string') {
      updateData.profileVisibility = mapStringToVisibility(body.profileVisibility);
    }
    if (typeof body.favoritesPublic === 'boolean') {
      updateData.favoritesPublic = body.favoritesPublic;
    }
    if (typeof body.isDeactivated === 'boolean') {
      updateData.isDeactivated = body.isDeactivated;
    }

    // Notification fields
    if (body.notifications) {
      if (body.notifications.email) {
        if (typeof body.notifications.email.messages === 'boolean') {
          updateData.emailNotifyMessages = body.notifications.email.messages;
        }
        if (typeof body.notifications.email.follows === 'boolean') {
          updateData.emailNotifyFollows = body.notifications.email.follows;
        }
        if (typeof body.notifications.email.product === 'boolean') {
          updateData.emailNotifyProduct = body.notifications.email.product;
        }
      }
      if (body.notifications.push) {
        if (typeof body.notifications.push.messages === 'boolean') {
          updateData.pushNotifyMessages = body.notifications.push.messages;
        }
        if (typeof body.notifications.push.follows === 'boolean') {
          updateData.pushNotifyFollows = body.notifications.push.follows;
        }
        if (typeof body.notifications.push.product === 'boolean') {
          updateData.pushNotifyProduct = body.notifications.push.product;
        }
      }
    }

    // Preference fields
    if (typeof body.enableNsfwContent === 'boolean') {
      updateData.enableNsfwContent = body.enableNsfwContent;
    }

    // Connection fields
    if (body.connections) {
      if (typeof body.connections.discord === 'string') {
        updateData.discordHandle = body.connections.discord.trim() || null;
      }
      if (typeof body.connections.x === 'string') {
        updateData.twitterHandle = body.connections.x.trim() || null;
      }
      if (typeof body.connections.reddit === 'string') {
        updateData.redditHandle = body.connections.reddit.trim() || null;
      }
      if (typeof body.connections.instagram === 'string') {
        updateData.instagramHandle = body.connections.instagram.trim() || null;
      }
      if (typeof body.connections.website === 'string') {
        updateData.websiteUrl = body.connections.website.trim() || null;
      }
    }

    // Upsert the user (create if doesn't exist)
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      avatarDecoration: mapDecorationToString(user.avatarDecoration),
      avatarDecorationUrl: user.avatarDecorationUrl ?? null,
      profileVisibility: mapVisibilityToString(user.profileVisibility),
      favoritesPublic: user.favoritesPublic,
      isDeactivated: user.isDeactivated,
      enableNsfwContent: user.enableNsfwContent,
      connections: {
        discord: user.discordHandle ?? '',
        x: user.twitterHandle ?? '',
        reddit: user.redditHandle ?? '',
        instagram: user.instagramHandle ?? '',
        website: user.websiteUrl ?? '',
      },
      notifications: {
        email: {
          messages: user.emailNotifyMessages,
          follows: user.emailNotifyFollows,
          product: user.emailNotifyProduct,
        },
        push: {
          messages: user.pushNotifyMessages,
          follows: user.pushNotifyFollows,
          product: user.pushNotifyProduct,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user - Create or initialize user (called on first visit)
export async function POST(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  const handle = request.headers.get('x-vp-user-handle')?.trim();

  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Missing or invalid x-vp-user-id' }, { status: 400 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        handle: handle && handle.length > 0 ? handle : null,
      },
      update: {},
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      createdAt: user.createdAt,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      avatarDecoration: mapDecorationToString(user.avatarDecoration),
      avatarDecorationUrl: user.avatarDecorationUrl ?? null,
      profileVisibility: mapVisibilityToString(user.profileVisibility),
      favoritesPublic: user.favoritesPublic,
      isDeactivated: user.isDeactivated,
      enableNsfwContent: user.enableNsfwContent,
      connections: {
        discord: user.discordHandle ?? '',
        x: user.twitterHandle ?? '',
        reddit: user.redditHandle ?? '',
        instagram: user.instagramHandle ?? '',
        website: user.websiteUrl ?? '',
      },
      notifications: {
        email: {
          messages: user.emailNotifyMessages,
          follows: user.emailNotifyFollows,
          product: user.emailNotifyProduct,
        },
        push: {
          messages: user.pushNotifyMessages,
          follows: user.pushNotifyFollows,
          product: user.pushNotifyProduct,
        },
      },
      followersCount: user._count.followers,
      followingCount: user._count.following,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
