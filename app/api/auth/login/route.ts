export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  setAuthCookies,
} from '@/lib/auth';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has a password (might be OAuth-only account)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account uses social login. Please sign in with Google or another provider.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is deactivated
    if (user.isDeactivated) {
      return NextResponse.json(
        { error: 'This account has been deactivated' },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = await signAccessToken(user.id, user.role, user.isAdmin);
    const refreshToken = await signRefreshToken(user.id);

    // Store refresh token atomically (delete expired + create new)
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
    ]);

    // Create response with cookies
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
