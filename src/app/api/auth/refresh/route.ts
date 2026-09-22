export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  setAuthCookies,
  clearAuthCookies,
  getRefreshToken,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const refreshToken = getRefreshToken(request);

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload?.userId) {
      const response = NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      const response = NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      const response = NextResponse.json(
        { error: 'Refresh token expired' },
        { status: 401 }
      );
      return clearAuthCookies(response);
    }

    const user = storedToken.user;

    // Check if user is deactivated
    if (user.isDeactivated) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      const response = NextResponse.json(
        { error: 'Account has been deactivated' },
        { status: 403 }
      );
      return clearAuthCookies(response);
    }

    // Generate new tokens (token rotation for security)
    const newAccessToken = await signAccessToken(user.id, user.role, user.isAdmin);
    const newRefreshToken = await signRefreshToken(user.id);

    // Atomic token rotation: delete old + create new
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
    ]);

    // Return new tokens
    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });

    return setAuthCookies(response, newAccessToken, newRefreshToken);
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    const response = NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
    return clearAuthCookies(response);
  }
}
