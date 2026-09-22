export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  validatePassword,
  validateEmail,
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  setAuthCookies,
} from '@/lib/auth';

interface RegisterRequest {
  email: string;
  password: string;
  handle?: string;
}

export async function POST(request: Request) {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, handle } = body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate password
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Check if handle is taken (if provided)
    if (handle) {
      const existingHandle = await prisma.user.findUnique({
        where: { handle: handle.toLowerCase() },
      });

      if (existingHandle) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user - handle will be null if not provided (set in personalization step)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        handle: handle?.toLowerCase() || null,
        emailVerified: null, // Will be set when email is verified
      },
      select: {
        id: true,
        email: true,
        handle: true,
        avatarUrl: true,
        role: true,
        isAdmin: true,
        bannerUrl: true,
        bio: true,
        emailVerified: true,
        profileVisibility: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = await signAccessToken(user.id, user.role, user.isAdmin);
    const refreshToken = await signRefreshToken(user.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // Create response with cookies
    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user,
      },
      { status: 201 }
    );

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
