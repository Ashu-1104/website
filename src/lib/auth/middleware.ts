import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyAccessToken, signAccessToken, signRefreshToken, getRefreshTokenExpiry } from './jwt';
import { getAccessToken, getRefreshToken, setAuthCookies } from './cookies';
import { verifyRefreshToken } from './jwt';
import { hasAdminAccess } from './roles';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthResult {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
  authMethod: 'jwt' | 'legacy' | 'none';
}

/**
 * Get authenticated user from request
 * Supports both JWT (new) and x-vp-user-id header (legacy/deprecated)
 */
export async function getAuthUser(request: Request): Promise<AuthResult> {
  // Try JWT authentication first
  const accessToken = await getAccessToken(request);
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (user && !user.isDeactivated) {
        return {
          user,
          userId: user.id,
          isAuthenticated: true,
          authMethod: 'jwt',
        };
      }
    }
  }

  // Fall back to legacy x-vp-user-id header (deprecated)
  const legacyUserId = request.headers.get('x-vp-user-id')?.trim();
  if (legacyUserId && UUID_REGEX.test(legacyUserId)) {
    // Log deprecation warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Auth] Using deprecated x-vp-user-id header. Please migrate to JWT authentication.'
      );
    }

    let user = await prisma.user.findUnique({
      where: { id: legacyUserId },
    });

    // Auto-create user for legacy auth (maintains backward compatibility)
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: legacyUserId,
          handle: `user_${legacyUserId.slice(0, 6)}`,
        },
      });
    }

    if (user && !user.isDeactivated) {
      return {
        user,
        userId: user.id,
        isAuthenticated: true,
        authMethod: 'legacy',
      };
    }
  }

  return {
    user: null,
    userId: null,
    isAuthenticated: false,
    authMethod: 'none',
  };
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(request: Request): Promise<User> {
  const { user, isAuthenticated } = await getAuthUser(request);

  if (!isAuthenticated || !user) {
    throw new AuthError('Unauthorized', 401);
  }

  return user;
}

/**
 * Require JWT auth in production (legacy header allowed only outside production)
 */
export async function requireJwtAuth(request: Request): Promise<User> {
  const { user, isAuthenticated, authMethod } = await getAuthUser(request);

  if (!isAuthenticated || !user) {
    throw new AuthError('Unauthorized', 401);
  }

  if (process.env.NODE_ENV === 'production' && authMethod !== 'jwt') {
    throw new AuthError('Unauthorized', 401);
  }

  return user;
}

/**
 * Require admin access - throws error if not admin/support/developer
 */
export async function requireAdmin(request: Request): Promise<User> {
  const user = await requireAuth(request);

  if (!hasAdminAccess({ role: user.role, isAdmin: user.isAdmin })) {
    throw new AuthError('Forbidden', 403);
  }

  return user;
}

/**
 * Get user ID from request (for backward compatibility)
 * Returns null if not authenticated
 */
export async function getUserId(request: Request): Promise<string | null> {
  const { userId } = await getAuthUser(request);
  return userId;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Handle token refresh if access token is expired but refresh token is valid
 */
export async function handleTokenRefresh(
  request: Request
): Promise<{ success: true; user: User; response: NextResponse } | { success: false }> {
  const refreshToken = getRefreshToken(request);
  if (!refreshToken) {
    return { success: false };
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload?.userId) {
    return { success: false };
  }

  // Verify refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    // Delete expired token
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    }
    return { success: false };
  }

  const user = storedToken.user;
  if (!user || user.isDeactivated) {
    return { success: false };
  }

  // Generate new tokens
  const newAccessToken = await signAccessToken(user.id, user.role, user.isAdmin);
  const newRefreshToken = await signRefreshToken(user.id);

  // Rotate refresh token (delete old, create new)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // Create response with new cookies
  const response = NextResponse.json({ success: true });
  setAuthCookies(response, newAccessToken, newRefreshToken);

  return { success: true, user, response };
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Wrap API handler with auth error handling
 */
export function withAuth<T>(
  handler: (request: Request, user: User) => Promise<NextResponse<T>>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await requireAuth(request);
      return handler(request, user);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      throw error;
    }
  };
}
