import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60, // 15 minutes in seconds
};

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Set auth cookies on a NextResponse
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  return response;
}

/**
 * Clear auth cookies on a NextResponse
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, '', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE_NAME, '', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/**
 * Get access token from request cookies
 */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

/**
 * Get refresh token from request cookies
 */
export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

/**
 * Get access token from request (supports both cookies and Authorization header)
 */
export async function getAccessToken(request: Request): Promise<string | null> {
  // First try Authorization header (for API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Then try cookies (for browser)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    );
    if (cookies[AUTH_COOKIE_NAME]) {
      return cookies[AUTH_COOKIE_NAME];
    }
  }

  return null;
}

/**
 * Get refresh token from request
 */
export function getRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    );
    if (cookies[REFRESH_COOKIE_NAME]) {
      return cookies[REFRESH_COOKIE_NAME];
    }
  }
  return null;
}
