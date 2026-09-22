import { Server, Socket } from 'socket.io';
import { PrismaClient, PresenceStatus } from '@prisma/client';

interface PresenceData {
  status: PresenceStatus;
  lastSeenAt: string;
}

interface GetPresenceCallback {
  presences?: Record<string, PresenceData>;
  error?: string;
}

export function registerPresenceHandlers(
  io: Server,
  socket: Socket,
  prisma: PrismaClient
): void {
  const userId = socket.data.userId as string;

  // Get presence status for multiple users
  socket.on(
    'presence:get',
    async (userIds: string[], callback: (response: GetPresenceCallback) => void) => {
      try {
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return callback({ presences: {} });
        }

        // Limit to prevent abuse
        const limitedUserIds = userIds.slice(0, 100);

        const presences = await prisma.userPresence.findMany({
          where: { userId: { in: limitedUserIds } },
          select: { userId: true, status: true, lastSeenAt: true },
        });

        const presenceMap: Record<string, PresenceData> = {};
        for (const p of presences) {
          presenceMap[p.userId] = {
            status: p.status,
            lastSeenAt: p.lastSeenAt.toISOString(),
          };
        }

        callback({ presences: presenceMap });
      } catch (error) {
        console.error('Error getting presence:', error);
        callback({ error: 'Failed to get presence' });
      }
    }
  );

  // Subscribe to presence updates for specific users
  socket.on('presence:subscribe', (userIds: string[]) => {
    if (!Array.isArray(userIds)) return;

    // Limit subscriptions to prevent abuse
    const limitedUserIds = userIds.slice(0, 100);
    for (const id of limitedUserIds) {
      socket.join(`presence:${id}`);
    }
  });

  // Unsubscribe from presence updates
  socket.on('presence:unsubscribe', (userIds: string[]) => {
    if (!Array.isArray(userIds)) return;

    for (const id of userIds) {
      socket.leave(`presence:${id}`);
    }
  });

  // Update own presence status
  socket.on('presence:update', async (status: 'ONLINE' | 'AWAY') => {
    try {
      if (status !== 'ONLINE' && status !== 'AWAY') {
        return;
      }

      await prisma.userPresence.upsert({
        where: { userId },
        update: { status, lastSeenAt: new Date() },
        create: { userId, status, lastSeenAt: new Date(), socketId: socket.id },
      });

      // Broadcast to subscribers
      io.to(`presence:${userId}`).emit('presence:update', {
        userId,
        status,
        lastSeenAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  });

  // Broadcast initial online status to subscribers
  io.to(`presence:${userId}`).emit('presence:update', {
    userId,
    status: 'ONLINE',
    lastSeenAt: new Date().toISOString(),
  });
}
