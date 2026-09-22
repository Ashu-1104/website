export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get refresh token to delete from database
    const refreshToken = getRefreshToken(request);

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookies
    const response = NextResponse.json({ message: 'Logged out successfully' });
    return clearAuthCookies(response);
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    // Still clear cookies even if database operation fails
    const response = NextResponse.json({ message: 'Logged out' });
    return clearAuthCookies(response);
  }
}
