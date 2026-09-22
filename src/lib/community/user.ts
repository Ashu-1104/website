import { prisma } from '@/lib/db';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BadRequestError extends Error {}

export async function getOrCreateUserFromRequest(request: Request) {
  const userId = request.headers.get('x-vp-user-id')?.trim() ?? '';
  if (!UUID_REGEX.test(userId)) throw new BadRequestError('Missing or invalid x-vp-user-id');

  const handle = request.headers.get('x-vp-user-handle')?.trim();

  try {
    return await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, handle: handle && handle.length > 0 ? handle : null },
      update: handle && handle.length > 0 ? { handle } : {},
    });
  } catch {
    // If the handle collides with an existing user, fall back to creating/upserting by id only.
    return prisma.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {},
    });
  }
}

