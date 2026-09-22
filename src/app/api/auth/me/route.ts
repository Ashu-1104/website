export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthUser, handleTokenRefresh } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { user, isAuthenticated, authMethod } = await getAuthUser(request);

    if (!isAuthenticated || !user) {
      // Access token expired/missing — try auto-refresh if refresh token is valid (#97)
      const refreshResult = await handleTokenRefresh(request);

      if (refreshResult.success) {
        const refreshedUser = refreshResult.user;
        // Build a response with the user data and attach new auth cookies
        const response = NextResponse.json({
          user: {
            id: refreshedUser.id,
            email: refreshedUser.email,
            handle: refreshedUser.handle,
            avatarUrl: refreshedUser.avatarUrl,
            bannerUrl: refreshedUser.bannerUrl,
            bio: refreshedUser.bio,
            role: refreshedUser.role,
            isAdmin: refreshedUser.isAdmin,
            emailVerified: refreshedUser.emailVerified,
            profileVisibility: refreshedUser.profileVisibility,
            createdAt: refreshedUser.createdAt,
          },
          authMethod: 'jwt' as const,
        });

        // Copy the Set-Cookie headers from the refresh response
        const refreshCookies = refreshResult.response.headers.getSetCookie();
        for (const cookie of refreshCookies) {
          response.headers.append('Set-Cookie', cookie);
        }

        return response;
      }

      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        role: user.role,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        profileVisibility: user.profileVisibility,
        createdAt: user.createdAt,
      },
      authMethod,
    });
  } catch (error) {
    console.error('[Auth] Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
