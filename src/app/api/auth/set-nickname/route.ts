export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const authResult = await getAuthUser(request);

    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    const body = await request.json();
    const { nickname } = body;

    // Validate nickname
    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { error: 'Nickname is required' },
        { status: 400 }
      );
    }

    const trimmedNickname = nickname.trim().toLowerCase();

    if (trimmedNickname.length < 3) {
      return NextResponse.json(
        { error: 'Nickname must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (trimmedNickname.length > 20) {
      return NextResponse.json(
        { error: 'Nickname must be 20 characters or less' },
        { status: 400 }
      );
    }

    // Only allow alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(trimmedNickname)) {
      return NextResponse.json(
        { error: 'Nickname can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if nickname is already taken
    const existingUser = await prisma.user.findUnique({
      where: { handle: trimmedNickname },
    });

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'This nickname is already taken' },
        { status: 409 }
      );
    }

    // Update user's handle
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { handle: trimmedNickname },
      select: {
        id: true,
        email: true,
        handle: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        emailVerified: true,
        profileVisibility: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[Auth] Set nickname error:', error);
    return NextResponse.json(
      { error: 'Failed to set nickname' },
      { status: 500 }
    );
  }
}
