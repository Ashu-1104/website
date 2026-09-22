import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPayload extends JWTPayload {
  userId: string;
  type: 'access' | 'refresh';
  role?: string;
  isAdmin?: boolean;
}

/**
 * Sign an access token (short-lived, 15 minutes)
 */
export async function signAccessToken(
  userId: string,
  role?: string | null,
  isAdmin?: boolean
): Promise<string> {
  const payload: TokenPayload = { userId, type: 'access' };
  if (role) payload.role = role;
  if (typeof isAdmin === 'boolean') payload.isAdmin = isAdmin;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Sign a refresh token (long-lived, 7 days)
 */
export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'access') return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Get expiry time for refresh token (7 days from now)
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

/**
 * Get expiry time for session (30 days from now)
 */
export function getSessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return expiry;
}
