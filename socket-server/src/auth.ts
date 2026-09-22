import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH_COOKIE_NAME = 'auth_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    const value = rest.join('=');
    acc[rawKey] = value ? decodeURIComponent(value) : '';
    return acc;
  }, {});
}

async function getUserIdFromToken(cookieHeader?: string): Promise<string | null> {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'access') return null;
    const userId = typeof payload.userId === 'string' ? payload.userId : null;
    if (!userId || !UUID_REGEX.test(userId)) return null;
    return userId;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
  prisma: PrismaClient
): Promise<void> {
  try {
    const rawCookieHeader = socket.handshake.headers?.cookie;
    const cookieHeader = Array.isArray(rawCookieHeader)
      ? rawCookieHeader.join('; ')
      : rawCookieHeader;
    const tokenUserId = await getUserIdFromToken(cookieHeader);
    const legacyUserId =
      (socket.handshake.auth?.userId as string | undefined) ||
      (socket.handshake.query?.userId as string | undefined);
    let userId = tokenUserId;
    if (!userId && !IS_PRODUCTION && legacyUserId && UUID_REGEX.test(legacyUserId)) {
      userId = legacyUserId;
    }

    if (!userId) {
      return next(new Error('Authentication failed: Invalid access token'));
    }

    // Verify user exists (create if needed)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      if (IS_PRODUCTION) {
        return next(new Error('Authentication failed: User not found'));
      }
      await prisma.user.create({ data: { id: userId } });
    }

    // Store userId in socket data for handlers
    socket.data.userId = userId;

    // Update presence to online
    await prisma.userPresence.upsert({
      where: { userId },
      update: { status: 'ONLINE', lastSeenAt: new Date(), socketId: socket.id },
      create: { userId, status: 'ONLINE', lastSeenAt: new Date(), socketId: socket.id },
    });

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
}
